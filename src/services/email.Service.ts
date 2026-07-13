import nodemailer from "nodemailer";
import { TemplateRenderer } from "../utils/templateRenderer";

class EmailService {

    private transporter;

    constructor() {

        this.transporter =
            nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // use SSL
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    // Do not fail on invalid certs in live environments
                    rejectUnauthorized: false
                }
            });

    }

    async verifyConnection() {

        try {

            await this.transporter.verify();

            console.log(
                "Email server connected"
            );

        } catch(error) {

            console.log(
                "Email connection error:",
                error
            );
        }
    }

    async sendOtp(
        email:string,
        otp:string
    ){
        const html = TemplateRenderer.renderTemplate('email-verification', {
            user_name: 'User',
            otp_code: otp,
            verify_url: process.env.APP_URL || 'http://localhost:4200'
        });

        return this.transporter.sendMail({
            from: `"System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject:"OTP Verification",
            html: html
        });
    }

    async sendTemporaryPassword(
        email:string,
        password:string,
        name:string
    ){
        const html = TemplateRenderer.renderTemplate('account-created', {
            user_name: name,
            password: password,
            dashboard_url: process.env.APP_URL || 'http://localhost:4200'
        });

        return this.transporter.sendMail({
            from: `"System" <${process.env.EMAIL_USER}>`,
            to:email,
            subject:"Account Created",
            html: html
        });
    }

    async sendInvoice(
        email:string,
        filePath:string,
        invoiceNo:string
    ){
        const html = TemplateRenderer.renderTemplate('invoice-receipt', {
            user_name: 'Customer',
            invoice_id: invoiceNo,
            amount: 'See attached PDF',
            invoice_url: process.env.APP_URL || 'http://localhost:4200'
        });

        return this.transporter.sendMail({
            from:`"Invoice System" <${process.env.EMAIL_USER}>`,
            to:email,
            subject:`Invoice ${invoiceNo}`,
            html: html,
            attachments:[
                {
                    filename:`${invoiceNo}.pdf`,
                    path:filePath
                }
            ]
        });
    }

}

export default new EmailService();