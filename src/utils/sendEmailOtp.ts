import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export function generateTempPassword() {
    return crypto
        .randomBytes(10)
        .toString("hex");
}

export class EmailService {

    private static transporter =
    nodemailer.createTransport({

        service:"gmail",

        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        }

    });


    static async verifyConnection(){

        try{

            await this.transporter.verify();

            console.log(
                "✅ Email server connected"
            );

        }
        catch(error){

            console.log(
                "❌ Email configuration error:",
                error
            );

        }

    }
    private static getTemplate(
        title: string,
        subtitle: string,
        content: string,
        gradient: string
    ) {
        return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap');
    
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #060b17;
      color: #94a3b8;
    }
    
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #0b1120;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
    }
    
    .hero-banner {
      background: ${gradient};
      padding: 48px 32px;
      text-align: center;
      position: relative;
    }
    
    /* Elegant glass overlay */
    .hero-banner::after {
      content: "";
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 70px;
      background: linear-gradient(to top, #0b1120, transparent);
    }

    .hero-banner h1 {
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 30px;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
      text-shadow: 0 4px 12px rgba(0,0,0,0.25);
      position: relative;
      z-index: 2;
    }
    
    .hero-banner p {
      color: rgba(255,255,255,0.92);
      font-size: 16px;
      margin: 0;
      font-weight: 500;
      letter-spacing: 0.01em;
      position: relative;
      z-index: 2;
      text-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .content-body {
      padding: 40px 48px;
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.65;
    }
    
    .content-body h2 {
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.01em;
    }

    .content-body p {
      margin: 0 0 16px 0;
    }
    
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 18px;
      padding: 24px;
      margin: 28px 0;
      text-align: center;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .card p {
      margin: 0 0 10px 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    
    .code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 4px;
      margin: 0;
      text-shadow: 0 0 16px rgba(255,255,255,0.15);
    }
    
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: ${gradient};
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 500px;
      margin: 20px 0 10px;
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      letter-spacing: 0.01em;
    }
    
    .email-footer {
      background: #070c17;
      padding: 32px 48px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    
    .email-footer p {
      color: #64748b;
      font-size: 12px;
      margin: 0 0 12px 0;
      line-height: 1.6;
    }
    
    .social-links {
      margin: 20px 0 0 0;
    }
    
    .social-links a {
      color: #4f46e5;
      text-decoration: none;
      margin: 0 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .hero-banner { padding: 40px 24px !important; }
      .content-body { padding: 32px 24px !important; }
      .email-footer { padding: 28px 24px !important; }
      .code { font-size: 26px !important; letter-spacing: 3px !important; }
      .button { display: block !important; text-align: center !important; margin: 16px 0 0 0 !important; }
    }
  </style>
</head>
<body>
  <!-- Visually Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #060b17; line-height: 1px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${subtitle}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #060b17;">
    <tr>
      <td align="center" valign="top">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container">
          <!-- Hero Section -->
          <tr>
            <td align="center" class="hero-banner">
              <h1>${title}</h1>
              <p>${subtitle}</p>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td class="content-body">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p>&copy; ${new Date().getFullYear()} SVK E-Com Command Center. All Rights Reserved.</p>
              <div class="social-links">
                <a href="#">Dashboard</a>
                <a href="#">Support</a>
                <a href="#">Privacy Policy</a>
              </div>
              <br>
              <p style="font-size: 10px; opacity: 0.7;">This is an automated operational email. Please do not reply directly to this address.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
    }

    // =======================================
    // Welcome Email
    // =======================================

    static async sendTemporaryPassword(
        email: string,
        password: string,
        name: string
    ) {
        try {
            const html = this.getTemplate(
                "Welcome Aboard 🚀",
                "Your account has been created successfully",
                `
<h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Welcome to the SVK E-Com Workspace, ${name}!</h2>
<p>We are thrilled to welcome you to our unified administration platform. Your corporate profile has been successfully provisioned by the system administrator.</p>

<p>To access your dashboard and initialize your secure session, please use the temporary access credentials provided below:</p>

<div class="card">
  <p>Temporary Access Password</p>
  <div class="code">${password}</div>
</div>

<div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 16px; margin: 24px 0; color: #e2e8f0; font-size: 14px; text-align: left;">
  <strong>⚠️ Mandatory Action Required:</strong> For security compliance, you will be prompted to reset this temporary password immediately upon your first login.
</div>

<p>Click the button below to verify your credentials and log in to your workspace:</p>

<center>
  <a href="${process.env.APP_URL}" class="button">Access My Dashboard</a>
</center>
`,
                `linear-gradient(135deg, #4F46E5, #7C3AED)`
            );

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "🎉 Welcome to Our Platform",
                html
            });
        } catch (error) {
            console.log("sendTemporaryPassword error:", error);
            throw error;
        }
    }

    // =======================================
    // OTP Email
    // =======================================

    static async sendOtp(
        email: string,
        otp: string
    ) {
        try {
            const html = this.getTemplate(
                "Email Verification 🔐",
                "Secure access verification",
                `
<h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">One-Time Verification Request</h2>
<p>We received a request to verify your email address. For your security, please use the following one-time passcode (OTP) to validate your action:</p>

<div class="card">
  <p>One-Time Passcode</p>
  <div class="code">${otp}</div>
</div>

<div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 12px; padding: 16px; margin: 24px 0; color: #e2e8f0; font-size: 14px; text-align: left;">
  <strong>⏳ Time-Sensitive Alert:</strong> This security passcode is valid for exactly <strong>5 minutes</strong>. If it expires, you will need to request a new validation code.
</div>

<p>If you did not request this verification, please secure your account credentials immediately or contact support.</p>
`,
                `linear-gradient(135deg, #0EA5E9, #3B82F6)`
            );

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "🔑 OTP Verification",
                html
            });
        } catch (error) {
            console.log("sendOtp error:", error);
            throw error;
        }
    }

    // =======================================
    // Company Admin Email
    // =======================================

    static async sendCompanyAdminCredentials(
        email: string,
        password: string,
        token: string
    ) {
        try {
            const verifyUrl = `${process.env.APP_URL}/authentication/verify/${token}`;
            const html = this.getTemplate(
                "Company Admin Setup 🏢",
                "Your administrator workspace is ready",
                `
<h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Administrative Workspace Provisioned</h2>
<p>Congratulations! Your corporate administrator workspace has been successfully initialized and is ready for use.</p>

<p>Below are your secure setup credentials. Please click the button below to verify your email address and activate your administration account:</p>

<div class="card">
  <p>Temporary Admin Password</p>
  <div class="code">${password}</div>
</div>

<div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; border-radius: 12px; padding: 16px; margin: 24px 0; color: #e2e8f0; font-size: 14px; text-align: left;">
  <strong>💡 Getting Started:</strong> Once activated, you can begin configuring company branches, managing workforce permissions, and tracking real-time sales performance.
</div>

<center>
  <a href="${verifyUrl}" class="button">Activate Workspace & Verify Email</a>
</center>

<p style="margin-top: 24px;">Please note that you will be required to configure a new, strong password during your initial workspace access.</p>
`,
                `linear-gradient(135deg, #059669, #10B981)`
            );

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "🏢 Company Admin Account Created",
                html
            });
        } catch (error) {
            console.log("sendCompanyAdminCredentials error:", error);
            throw error;
        }
    }

    static async sendRegistrationVerification(
        email: string,
        ownerName: string,
        verifyUrl: string
    ) {
        try {
            const html = this.getTemplate(
                "Verify Your Email Address ✉️",
                "Registration setup validation",
                `
<h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Welcome, ${ownerName}!</h2>
<p>Thank you for registering your business with SVK E-Com. Please verify your email address to continue configuring your workspace details.</p>

<p>Click the button below to verify your email address and authorize your registration:</p>

<center>
  <a href="${verifyUrl}" class="button">Verify Email Address</a>
</center>

<div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 16px; margin: 24px 0; color: #e2e8f0; font-size: 14px; text-align: left;">
  <strong>⏳ Token Expiry:</strong> This secure verification link is valid for exactly <strong>24 hours</strong>. If it expires, you will need to register again.
</div>
`,
                `linear-gradient(135deg, #6366f1, #8b5cf6)`
            );

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "🔑 Verify your SVK E-Com registration",
                html
            });
        } catch (error) {
            console.log("sendRegistrationVerification error:", error);
            throw error;
        }
    }

    static async sendTrialApproval(
        email: string,
        ownerName: string,
        preferredPlan: string,
        setupUrl: string
    ) {
        try {
            const html = this.getTemplate(
                "Registration Approved! 🎉",
                "Your account workspace is ready",
                `
<h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Workspace Active, ${ownerName}!</h2>
<p>We are pleased to inform you that your request for plan "${preferredPlan}" has been approved. Please click the button below to initialize your password and start using the system.</p>

<center>
  <a href="${setupUrl}" class="button">Set Up Workspace Password</a>
</center>

<div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; border-radius: 12px; padding: 16px; margin: 24px 0; color: #e2e8f0; font-size: 14px; text-align: left;">
  <strong>💡 Getting Started:</strong> Use your registered email and the new password you create to log in to your custom administrative console.
</div>
`,
                `linear-gradient(135deg, #10b981, #059669)`
            );

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "🔑 SVK E-Com Registration Approved - Setup Password",
                html
            });
        } catch (error) {
            console.log("sendTrialApproval error:", error);
            throw error;
        }
    }
}