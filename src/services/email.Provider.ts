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
      smtpStatus = "failed";
      const msg = error?.message || String(error);
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

    // Only send real emails on the live server to save Resend quota
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n📧 [DEV MODE] Email mocked (not sent to Resend API)`);
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Status: Resend API is configured to ONLY run on live server.\n`);
      return;
    }

    const recipients = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];

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
