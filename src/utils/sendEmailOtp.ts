import nodemailer from "nodemailer";

export class EmailService {

  static async sendOtp(
    email: string,
    otp: string
  ) {

    const transporter =
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user:
            process.env.EMAIL_USER,
          pass:
            process.env.EMAIL_PASS
        }
      });

    await transporter.sendMail({
      from:
        `"PJSV ERP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject:
        "Password Reset OTP",
      html:
        this.getOtpTemplate(
          otp
        )
    });
  }

  static getOtpTemplate(
    otp: string
  ) {

    return `
      <div style="
      max-width:600px;
      margin:auto;
      background:#fff;
      border-radius:10px;
      overflow:hidden">

      <div style="
      background:#4f46e5;
      color:white;
      padding:20px;
      text-align:center">

      <h2>PJSV ERP</h2>

      </div>

      <div style="
      padding:30px">

      <h3>Password Reset</h3>

      <p>
      Use the OTP below:
      </p>

      <div style="
      font-size:32px;
      font-weight:bold;
      text-align:center;
      padding:20px;
      background:#f3f4f6">

      ${otp}

      </div>

      <p>
      Valid for 5 minutes.
      </p>

      </div>

      </div>
    `;
  }

}