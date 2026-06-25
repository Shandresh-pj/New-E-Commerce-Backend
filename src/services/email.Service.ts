import nodemailer from "nodemailer";

class EmailService {

    private transporter;

    constructor() {

        this.transporter =
            nodemailer.createTransport({

                service: "gmail",

                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
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

        return this.transporter.sendMail({

            from: `"System" <${process.env.EMAIL_USER}>`,
            to: email,

            subject:"OTP Verification",

            html:`

            <div style="font-family:Arial">

            <h2>Email Verification</h2>

            <p>Your OTP:</p>

            <h1>${otp}</h1>

            <p>
            Expires in 5 minutes
            </p>

            </div>

            `
        });

    }

    async sendTemporaryPassword(
        email:string,
        password:string,
        name:string
    ){

        return this.transporter.sendMail({

            from: `"System" <${process.env.EMAIL_USER}>`,
            to:email,

            subject:"Account Created",

            html:`

            <div>

            <h2>
            Welcome ${name}
            </h2>

            <p>
            Temporary Password:
            </p>

            <h3>
            ${password}
            </h3>

            </div>

            `
        });

    }

    async sendInvoice(
        email:string,
        filePath:string,
        invoiceNo:string
    ){

        return this.transporter.sendMail({

            from:`"Invoice System" <${process.env.EMAIL_USER}>`,

            to:email,

            subject:`Invoice ${invoiceNo}`,

            text:"Please find attached invoice",

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