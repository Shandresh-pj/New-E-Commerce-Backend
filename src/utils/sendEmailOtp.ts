import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { TemplateRenderer } from "./templateRenderer";

dotenv.config();

export function generateTempPassword() {
    return crypto
        .randomBytes(10)
        .toString("hex");
}

export class EmailService {

    private static transporter =
    nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
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

    // =======================================
    // Welcome Email
    // =======================================

    static async sendTemporaryPassword(
        email: string,
        password: string,
        name: string
    ) {
        try {
            const html = TemplateRenderer.renderTemplate('account-created', {
                user_name: name,
                password: password,
                dashboard_url: process.env.FRONTEND_URL || 'http://localhost:4200'
            });

            await this.transporter.sendMail({
                from: `"SVK E-Com" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Welcome to Our Platform",
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
            const html = TemplateRenderer.renderTemplate('email-verification', {
                user_name: 'User',
                otp_code: otp,
                verify_url: process.env.FRONTEND_URL || 'http://localhost:4200'
            });

            await this.transporter.sendMail({
                from: `"SVK E-Com Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "OTP Verification",
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
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const verifyUrl = `${frontendUrl}/authentication/verify/${token}`;
            const html = TemplateRenderer.renderTemplate('account-created', {
                user_name: 'Admin',
                password: password,
                dashboard_url: verifyUrl
            });

            await this.transporter.sendMail({
                from: `"SVK E-Com System" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Company Admin Account Created",
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
            const html = TemplateRenderer.renderTemplate('email-verification', {
                user_name: ownerName,
                otp_code: 'VERIFY',
                verify_url: verifyUrl
            });

            await this.transporter.sendMail({
                from: `"SVK E-Com Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Verify your SVK E-Com Registration",
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
            const html = TemplateRenderer.renderTemplate('trial-started', {
                user_name: ownerName,
                trial_end_date: '30 Days',
                features_url: setupUrl
            });

            await this.transporter.sendMail({
                from: `"SVK E-Com System" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "SVK E-Com Registration Approved - Setup Password",
                html
            });
        } catch (error) {
            console.log("sendTrialApproval error:", error);
            throw error;
        }
    }
}