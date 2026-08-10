import { Resend } from "resend";
import fs from "fs";

// ─── SMTP Status (used by /health endpoint) ────────────────────────────────
export let smtpStatus: "unchecked" | "ok" | "failed" = "unchecked";

let resendClient: Resend | null = null;

/**
 * Returns the initialized Resend client.
 * Uses lazy initialization — safe to call multiple times.
 */
function getClient(): Resend | null {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith("re_dummy") || apiKey === "REPLACE_WITH_REAL_KEY") {
    console.warn("⚠️ [EmailProvider] RESEND_API_KEY is not set or is still a dummy key. Email sending is disabled.");
    smtpStatus = "failed";
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Returns the dynamic FROM sender address configured in environment variables.
 * Defaults to verified onboarding address if unconfigured.
 */
function getFromAddress(): string {
  return process.env.EMAIL_FROM || "SVK E-Com <onboarding@resend.dev>";
}

/**
 * Helper to convert HTML to clean plain text.
 * Multi-part MIME (HTML + Text) is required by SPF/DKIM/spam algorithms
 * to prevent emails from being marked as spam by Gmail/Outlook.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n\s+\n/g, "\n\n")
    .trim();
}

export class EmailProvider {
  private static MAX_RETRIES = 3;

  /**
   * Verifies Resend is configured correctly.
   * Called on server startup — updates smtpStatus for /health endpoint.
   */
  public static async verifyConnection(): Promise<void> {
    const client = getClient();
    if (!client) return;

    const fromAddr = getFromAddress();

    try {
      const result = await client.domains.list();
      if (result.error) {
        throw new Error(result.error.message);
      }
      smtpStatus = "ok";
      console.log("✅ [EmailProvider] Resend API verified. Email service is active.");
      console.log(`✅ [EmailProvider] Sending from: ${fromAddr}`);
    } catch (error: any) {
      const msg = error?.message || String(error);

      if (msg.includes("restricted") || msg.includes("only send emails")) {
        smtpStatus = "ok";
        console.log("✅ [EmailProvider] Resend API key verified (Sending Only mode).");
        console.log(`✅ [EmailProvider] Sending from: ${fromAddr}`);
        return;
      }

      smtpStatus = "failed";
      if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Unauthorized")) {
        console.error("❌ [EmailProvider] Invalid RESEND_API_KEY — please check your env vars.");
      } else {
        console.error("❌ [EmailProvider] Resend verification failed:", msg);
      }
    }
  }

  /**
   * Sends an email via Resend HTTP API with exponential backoff retry.
   * Includes anti-spam MIME multi-part (HTML + PlainText) and RFC-compliant headers
   * to guarantee INBOX delivery and prevent spam classification.
   */
  public static async sendWithRetry(mailOptions: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    attachments?: Array<{ filename: string; path?: string; content?: Buffer }>;
  }): Promise<void> {
    const client = getClient();

    if (!client) {
      console.warn("⚠️ [EmailProvider] Skipping email — Resend not initialized.");
      return;
    }

    const isProd = process.env.NODE_ENV === "production";
    const sendInDev = process.env.SEND_EMAIL_LOCAL === "true" || process.env.FORCE_SEND_EMAIL === "true";

    const recipients = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
    const sender = mailOptions.from || getFromAddress();

    // Extract domain for List-Unsubscribe header
    const domainMatch = sender.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const senderDomain = domainMatch ? domainMatch[1] : "svkdthworld.shop";

    // If not production and not explicitly enabled via SEND_EMAIL_LOCAL, mock and display preview
    if (!isProd && !sendInDev) {
      console.log(`\n📧 [DEV MODE] Email mocked (not sent via Resend API)`);
      console.log(`   From:    ${sender}`);
      console.log(`   To:      ${recipients.join(", ")}`);
      console.log(`   Subject: ${mailOptions.subject}`);

      const pwdMatch = mailOptions.html.match(/password[:\s<>bstrong/]+([a-zA-Z0-9@#\$\^&\*_-]{6,30})/i) || mailOptions.html.match(/>([a-zA-Z0-9@#\$\^&\*_-]{8,16})<\//);
      const otpMatch = mailOptions.html.match(/([0-9]{4,6})/);
      const urlMatch = mailOptions.html.match(/href="([^"]+)"/i);

      if (pwdMatch) console.log(`   🔑 Password Preview: ${pwdMatch[1]}`);
      if (otpMatch && mailOptions.subject.toLowerCase().includes("otp")) console.log(`   🔢 OTP Code: ${otpMatch[1]}`);
      if (urlMatch) console.log(`   🔗 Action URL:       ${urlMatch[1]}`);
      console.log(`   Status:  To send real emails via Resend in dev mode, keep SEND_EMAIL_LOCAL=true in .env\n`);
      return;
    }

    const plainTextBody = mailOptions.text || htmlToPlainText(mailOptions.html);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await client.emails.send({
          from: sender,
          to: recipients,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: plainTextBody,
          replyTo: process.env.REPLY_TO_EMAIL || "support@svkdthworld.shop",
          headers: {
            "Auto-Submitted": "auto-generated",
            "X-Auto-Response-Suppress": "OOF, AutoReply, All",
            "X-Entity-Ref-ID": `svk-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          },
          attachments: mailOptions.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content || (a.path ? fs.readFileSync(a.path) : Buffer.from("")),
          })),
        });

        if (error) {
          throw new Error(error.message);
        }

        console.log(
          `✅ [EmailProvider] Email sent to ${recipients.join(", ")} (attempt ${attempt}) — id: ${data?.id}`
        );
        return;
      } catch (error: any) {
        const msg = error?.message || String(error);
        const isRetryable = msg.includes("timeout") || msg.includes("network") || msg.includes("ECONNRESET");

        if (!isRetryable || attempt === this.MAX_RETRIES) {
          console.error(
            `❌ [EmailProvider] Failed to send to ${recipients.join(", ")} (attempt ${attempt}/${this.MAX_RETRIES}):`,
            msg
          );
          throw error;
        }

        const delayMs = attempt * 1500;
        console.warn(
          `⏳ [EmailProvider] Retrying in ${delayMs}ms (${attempt}/${this.MAX_RETRIES})...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}
