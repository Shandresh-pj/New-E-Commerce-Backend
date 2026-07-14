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

// ─── Sender address ───────────────────────────────────────────────────────
// Use your verified domain on Resend, e.g: "SVK E-Com <noreply@svkdthworld.shop>"
// Until domain is verified, use: "SVK E-Com <onboarding@resend.dev>"
const FROM_ADDRESS =
  process.env.EMAIL_FROM ||
  `SVK E-Com <onboarding@resend.dev>`;

export class EmailProvider {
  private static MAX_RETRIES = 3;

  /**
   * Verifies Resend is configured correctly.
   * Called on server startup — updates smtpStatus for /health endpoint.
   */
  public static async verifyConnection(): Promise<void> {
    const client = getClient();
    if (!client) return;

    try {
      // Resend doesn't have a "verify" API, so we check by listing domains
      // This confirms the API key is valid
      const result = await client.domains.list();
      if (result.error) {
        throw new Error(result.error.message);
      }
      smtpStatus = "ok";
      console.log("✅ [EmailProvider] Resend API verified. Email service is active.");
      console.log(`✅ [EmailProvider] Sending from: ${FROM_ADDRESS}`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      
      // If the user created a "Sending Only" key, it will fail the domains.list() 
      // but it is still perfectly valid for sending emails!
      if (msg.includes("restricted") || msg.includes("only send emails")) {
        smtpStatus = "ok";
        console.log("✅ [EmailProvider] Resend API key verified (Sending Only mode).");
        console.log(`✅ [EmailProvider] Sending from: ${FROM_ADDRESS}`);
        return;
      }

      smtpStatus = "failed";
      if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Unauthorized")) {
        console.error("❌ [EmailProvider] Invalid RESEND_API_KEY — please check your Render env vars.");
      } else {
        console.error("❌ [EmailProvider] Resend verification failed:", msg);
      }
    }
  }

  /**
   * Sends an email via Resend HTTP API with exponential backoff retry.
   * Uses HTTPS (port 443) — works on ALL cloud providers including Render free tier.
   */
  public static async sendWithRetry(mailOptions: {
    to: string | string[];
    subject: string;
    html: string;
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

    // If not production and not explicitly enabled via SEND_EMAIL_LOCAL, mock and display preview
    if (!isProd && !sendInDev) {
      console.log(`\n📧 [DEV MODE] Email mocked (not sent via Resend API)`);
      console.log(`   To:      ${recipients.join(", ")}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      
      // Extract key details from HTML so developer/tester can see passwords & links right in terminal
      const pwdMatch = mailOptions.html.match(/password[:\s<>bstrong/]+([a-zA-Z0-9@#\$\^&\*_-]{6,30})/i) || mailOptions.html.match(/>([a-zA-Z0-9@#\$\^&\*_-]{8,16})<\//);
      const otpMatch = mailOptions.html.match(/([0-9]{4,6})/);
      const urlMatch = mailOptions.html.match(/href="([^"]+)"/i);
      
      if (pwdMatch) console.log(`   🔑 Password Preview: ${pwdMatch[1]}`);
      if (otpMatch && mailOptions.subject.toLowerCase().includes("otp")) console.log(`   🔢 OTP Code: ${otpMatch[1]}`);
      if (urlMatch) console.log(`   🔗 Action URL:       ${urlMatch[1]}`);
      console.log(`   Status:  To send real emails via Resend in dev mode, keep SEND_EMAIL_LOCAL=true in .env\n`);
      return;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await client.emails.send({
          from: mailOptions.from || FROM_ADDRESS,
          to: recipients,
          subject: mailOptions.subject,
          html: mailOptions.html,
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
