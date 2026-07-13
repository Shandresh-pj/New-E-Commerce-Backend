import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

// ─── SMTP Status (used by health check) ────────────────────────────────────
export let smtpStatus: "unchecked" | "ok" | "failed" = "unchecked";

export class EmailProvider {
  private static transporter: Transporter | null = null;
  private static isInitialized = false;
  private static MAX_RETRIES = 3;
  private static smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  private static resolvedIp: string | null = null;

  /**
   * Resolves SMTP host to an IPv4 address to permanently bypass ENETUNREACH
   * errors on cloud environments (Render, AWS, Railway) that lack IPv6 routing.
   * This is the only 100% reliable fix — family:4 in Nodemailer v8 is silently ignored.
   */
  private static async resolveIPv4(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, { family: 4 }, (err, address) => {
        if (err) {
          console.warn(`⚠️ [EmailProvider] DNS lookup failed for ${hostname}, using hostname directly:`, err.message);
          resolve(hostname); // fall back to hostname if DNS fails
        } else {
          console.log(`✅ [EmailProvider] DNS resolved ${hostname} → ${address} (IPv4)`);
          resolve(address);
        }
      });
    });
  }

  /**
   * Initializes the SMTP transporter with:
   * - IPv4 DNS pre-resolution (real fix, not family:4 workaround)
   * - Connection pooling for performance
   * - Proper timeouts to prevent hangs
   * - Graceful degradation if credentials are missing
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    const user = process.env.EMAIL_USER || process.env.EMAIL;
    const pass = process.env.EMAIL_PASS;
    const host = this.smtpHost;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (!user || !pass) {
      console.warn("⚠️ [EmailProvider] EMAIL_USER or EMAIL_PASS not set. Email sending is disabled.");
      smtpStatus = "failed";
      return;
    }

    // Pre-resolve the SMTP host to an IPv4 IP address before Nodemailer connects.
    // This is the only guaranteed way to prevent ENETUNREACH on IPv6-disabled environments.
    const resolvedHost = await this.resolveIPv4(host);
    this.resolvedIp = resolvedHost;

    this.transporter = nodemailer.createTransport({
      host: resolvedHost,        // Use pre-resolved IPv4 IP, not the hostname
      port,
      secure,                    // true for port 465, false for STARTTLS (587)
      pool: true,                // Reuse connections instead of opening per-email
      maxConnections: 5,
      maxMessages: 100,
      auth: { user, pass },
      connectionTimeout: 10000,  // 10s — fail fast instead of hanging
      greetingTimeout: 10000,    // 10s — time to receive SMTP greeting
      socketTimeout: 15000,      // 15s — per-socket idle timeout
      tls: {
        rejectUnauthorized: false,
        servername: host,        // SNI must still use the original hostname, not the IP
      },
    });

    this.isInitialized = true;
  }

  /**
   * Validates SMTP connection on server startup.
   * Updates smtpStatus for the /health endpoint.
   */
  public static async verifyConnection(): Promise<void> {
    await this.init();
    if (!this.transporter) {
      smtpStatus = "failed";
      return;
    }

    try {
      await this.transporter.verify();
      smtpStatus = "ok";
      console.log("✅ [EmailProvider] SMTP verified — connected via IPv4 to", this.resolvedIp || this.smtpHost);
    } catch (error: any) {
      smtpStatus = "failed";

      // Provide actionable error diagnosis instead of a raw error dump
      const code: string = error.code || "";
      const msg: string = error.message || String(error);

      if (code === "EAUTH" || msg.includes("Missing credentials") || msg.includes("535")) {
        console.error("❌ [EmailProvider] SMTP auth failed — check EMAIL_USER and EMAIL_PASS (use App Password for Gmail):", msg);
      } else if (code === "ENETUNREACH" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        console.error(`❌ [EmailProvider] SMTP network error (${code}) — port ${process.env.SMTP_PORT || 587} may be blocked. Try port 587 with secure=false:`, msg);
      } else if (code === "ESOCKET" || code === "ECONNRESET") {
        console.error("❌ [EmailProvider] SMTP socket dropped — TLS/SSL mismatch or firewall:", msg);
      } else {
        console.error("❌ [EmailProvider] SMTP connection failed:", msg);
      }
    }
  }

  /**
   * Sends an email with automatic retry and exponential backoff.
   * All methods in sendEmailOtp.ts route through here.
   */
  public static async sendWithRetry(mailOptions: SendMailOptions): Promise<void> {
    await this.init();

    if (!this.transporter) {
      console.warn("⚠️ [EmailProvider] Skipping email — provider not initialized (check EMAIL_USER / EMAIL_PASS).");
      return;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ [EmailProvider] Email sent to ${mailOptions.to} (attempt ${attempt}) — messageId: ${info.messageId}`);
        return;
      } catch (error: any) {
        const isRetryable =
          error.code === "ETIMEDOUT" ||
          error.code === "ESOCKET" ||
          error.code === "ENETUNREACH" ||
          error.code === "ECONNREFUSED" ||
          error.code === "ECONNRESET";

        if (!isRetryable || attempt === this.MAX_RETRIES) {
          console.error(
            `❌ [EmailProvider] Failed to send to ${mailOptions.to} (attempt ${attempt}/${this.MAX_RETRIES}):`,
            error.code || error.message
          );
          throw error;
        }

        const delayMs = attempt * 1500; // 1.5s, 3s, 4.5s
        console.warn(
          `⏳ [EmailProvider] Network error (${error.code}). Retrying in ${delayMs}ms (${attempt}/${this.MAX_RETRIES})...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}
