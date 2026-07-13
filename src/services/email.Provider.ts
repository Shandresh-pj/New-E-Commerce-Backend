import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export class EmailProvider {
  private static transporter: Transporter | null = null;
  private static isInitialized = false;
  private static MAX_RETRIES = 3;

  /**
   * Initializes the SMTP transporter with pooling, IPv4 forcing, and robust configuration.
   */
  public static init() {
    if (this.isInitialized) return;

    const user = process.env.EMAIL_USER || process.env.EMAIL;
    const pass = process.env.EMAIL_PASS;
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (!user || !pass) {
      console.warn("⚠️ [EmailProvider] Missing EMAIL_USER or EMAIL_PASS. Email sending is disabled to prevent crashes.");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      pool: true, // Use pooled connections for performance
      maxConnections: 5,
      maxMessages: 100,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      // Force IPv4 resolution to prevent ENETUNREACH on environments lacking IPv6 support (Render, AWS)
      family: 4, 
    } as any);

    this.isInitialized = true;
  }

  /**
   * Validates the connection on server startup.
   */
  public static async verifyConnection(): Promise<void> {
    this.init();
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      console.log("✅ [EmailProvider] SMTP Connection Verified Successfully");
    } catch (error: any) {
      console.error("❌ [EmailProvider] SMTP Connection Failed:", error.message || error);
    }
  }

  /**
   * Universal internal method to send emails with exponential backoff and non-blocking architecture.
   */
  public static async sendWithRetry(mailOptions: SendMailOptions): Promise<void> {
    this.init();
    
    if (!this.transporter) {
      console.warn("⚠️ [EmailProvider] Email sending skipped (provider not initialized).");
      return;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        return; // Success, exit retry loop
      } catch (error: any) {
        const isNetworkError = 
          error.code === 'ETIMEDOUT' || 
          error.code === 'ESOCKET' || 
          error.code === 'ENETUNREACH' || 
          error.code === 'ECONNREFUSED';

        if (!isNetworkError || attempt === this.MAX_RETRIES) {
          console.error(`❌ [EmailProvider] Failed to send email to ${mailOptions.to} after ${attempt} attempts:`, error);
          throw error; // Let the facade decide how to handle it
        }

        const delayMs = attempt * 1000;
        console.warn(`⏳ [EmailProvider] Network error sending email. Retrying in ${delayMs}ms (Attempt ${attempt}/${this.MAX_RETRIES})...`);
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
}
