import crypto from "crypto";
import dotenv from "dotenv";
import { TemplateRenderer } from "./templateRenderer";
import { EmailProvider } from "../services/email.Provider";

dotenv.config();

export function generateTempPassword() {
    return crypto
        .randomBytes(10)
        .toString("hex");
}

export class EmailService {

    static async verifyConnection() {
        await EmailProvider.verifyConnection();
    }

    // =======================================
    // Welcome Email
    // =======================================

    static async sendTemporaryPassword(email: string, password: string, name: string) {
        const html = TemplateRenderer.renderTemplate('account-created', {
            user_name: name,
            password: password,
            dashboard_url: process.env.FRONTEND_URL || 'http://localhost:4200'
        });

        // Fire-and-forget sending to prevent blocking API responses
        EmailProvider.sendWithRetry({
            from: `"SVK E-Com" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "Welcome to Our Platform",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    // =======================================
    // OTP Email
    // =======================================

    static async sendOtp(email: string, otp: string) {
        const html = TemplateRenderer.renderTemplate('email-verification', {
            user_name: 'User',
            otp_code: otp,
            verify_url: process.env.FRONTEND_URL || 'http://localhost:4200'
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Security" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "OTP Verification",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    // =======================================
    // Company Admin Email
    // =======================================

    static async sendCompanyAdminCredentials(email: string, password: string, token: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const verifyUrl = `${frontendUrl}/authentication/verify/${token}`;
        const html = TemplateRenderer.renderTemplate('account-created', {
            user_name: 'Admin',
            password: password,
            dashboard_url: verifyUrl
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com System" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "Company Admin Account Created",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    static async sendRegistrationVerification(email: string, ownerName: string, verifyUrl: string) {
        const html = TemplateRenderer.renderTemplate('email-verification', {
            user_name: ownerName,
            otp_code: 'VERIFY',
            verify_url: verifyUrl
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Security" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "Verify your SVK E-Com Registration",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    static async sendTrialApproval(email: string, ownerName: string, preferredPlan: string, setupUrl: string) {
        const html = TemplateRenderer.renderTemplate('trial-started', {
            user_name: ownerName,
            trial_end_date: '30 Days',
            features_url: setupUrl
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com System" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "SVK E-Com Registration Approved - Setup Password",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    // =======================================
    // Newly Added Required Templates
    // =======================================

    static async sendPasswordReset(email: string, resetToken: string, name: string = 'User') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const resetUrl = `${frontendUrl}/authentication/reset-password/${resetToken}`;
        const html = TemplateRenderer.renderTemplate('password-reset', {
            user_name: name,
            reset_url: resetUrl
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Security" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "Password Reset Request",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    static async sendLoginAlert(email: string, name: string = 'User', ipAddress: string = 'Unknown', location: string = 'Unknown') {
        const html = TemplateRenderer.renderTemplate('login-alert', {
            user_name: name,
            ip_address: ipAddress,
            location: location,
            time: new Date().toLocaleString()
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Security" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "New Login Detected",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    static async sendPaymentSuccess(email: string, amount: string, transactionId: string, name: string = 'Customer') {
        const html = TemplateRenderer.renderTemplate('payment-success', {
            user_name: name,
            amount: amount,
            transaction_id: transactionId,
            dashboard_url: process.env.FRONTEND_URL || 'http://localhost:4200'
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Billing" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: `Payment Successful - ${transactionId}`,
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }

    static async sendContactFormConfirmation(email: string, name: string) {
        const html = TemplateRenderer.renderTemplate('contact-form-confirmation', {
            user_name: name
        });

        EmailProvider.sendWithRetry({
            from: `"SVK E-Com Support" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
            to: email,
            subject: "We received your message",
            html
        }).catch(err => console.error("[Facade] Background email error:", err.message));
    }
}