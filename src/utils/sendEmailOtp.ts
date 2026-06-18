import nodemailer from "nodemailer";
import crypto from "crypto";

export function generateTempPassword() {

  return crypto
    .randomBytes(10)
    .toString("hex");
}

export class EmailService {

  private static transporter =
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

  static async sendTemporaryPassword(
    email: string,
    password: string,
    name: string
  ) {

    await this.transporter.sendMail({
      to: email,
      subject: "Account Created Successfully",
      html: `
      <div style="font-family:Arial">

        <h2>Welcome ${name}</h2>

        <p>Your account has been created.</p>

        <p>
          Temporary Password:
        </p>

        <h3>${password}</h3>

        <p>
          Password change is mandatory on first login.
        </p>

      </div>
      `
    });
  }

  static async sendOtp(
    email: string,
    otp: string
  ) {

    await this.transporter.sendMail({
      to: email,
      subject: "OTP Verification",
      html: `
      <h2>Email Verification</h2>

      <h1>${otp}</h1>

      <p>OTP expires in 5 minutes.</p>
      `
    });
  }


  static async sendCompanyAdminCredentials(
  email: string,
  password: string,
  token: string
) {

  const verifyUrl =
    `${process.env.APP_URL}/companies/verify/${token}`;

  await this.transporter.sendMail({
    to: email,
    subject: "Company Admin Account Created",

    html: `
      <div style="font-family:Arial">

        <h2>Company Admin Account</h2>

        <p>
          Your company account has been created.
        </p>

        <p>
          Temporary Password:
        </p>

        <h3>${password}</h3>

        <p>
          Verify your email:
        </p>

        <a href="${verifyUrl}">
          Verify Email
        </a>

        <br/><br/>

        <p>
          Password change is mandatory
          after first login.
        </p>

      </div>
    `
  });
}
}

