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

        title:string,
        subtitle:string,
        content:string,
        gradient:string

    ){

return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Inter', Arial, sans-serif; background-color: #0b0f19; }
    
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #151a28;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
    }
    
    .hero-banner {
      background: ${gradient};
      padding: 50px 30px;
      text-align: center;
      position: relative;
    }
    
    .hero-banner::after {
      content: "";
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      background: linear-gradient(to top, #151a28, transparent);
    }

    .hero-banner h1 {
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 10px 0;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      position: relative;
      z-index: 2;
    }
    
    .hero-banner p {
      color: rgba(255,255,255,0.9);
      font-size: 18px;
      margin: 0;
      font-weight: 300;
      position: relative;
      z-index: 2;
    }
    
    .content-body {
      padding: 40px;
      color: #94a3b8;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .content-body h2 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 20px;
    }
    
    .info-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }
    
    .info-card p {
      margin: 0 0 15px 0;
      color: #94a3b8;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .code {
      font-size: 36px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 6px;
      margin: 0;
      text-shadow: 0 0 20px rgba(255,255,255,0.2);
    }
    
    .button {
      display: inline-block;
      background: ${gradient};
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 12px;
      margin-top: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    
    .email-footer {
      background: #0d111d;
      padding: 30px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    
    .email-footer p {
      color: #64748b;
      font-size: 13px;
      margin: 0 0 10px 0;
      line-height: 1.5;
    }
    
    .social-links {
      margin: 20px 0 0 0;
    }
    
    .social-links a {
      color: #94a3b8;
      text-decoration: none;
      margin: 0 12px;
      font-size: 13px;
      font-weight: 600;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .hero-banner { padding: 40px 20px !important; }
      .content-body { padding: 30px 20px !important; }
      .code { font-size: 28px !important; letter-spacing: 4px !important; }
      .button { display: block !important; width: auto !important; margin: 20px 0 0 0 !important; }
    }
  </style>
</head>
<body>
  <!-- Visually Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Inter', Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${subtitle}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19;">
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
              <p>&copy; ${new Date().getFullYear()} SVK Enterprise Systems. All Rights Reserved.</p>
              <div class="social-links">
                <a href="#">Dashboard</a>
                <a href="#">Support</a>
                <a href="#">Privacy Policy</a>
              </div>
              <br>
              <p style="font-size: 11px; opacity: 0.7;">This is an automated operational email. Please do not reply directly to this address.</p>
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

        email:string,
        password:string,
        name:string

    ){

        try{

            const html=

            this.getTemplate(

                "Welcome Aboard 🚀",

                "Your account has been created successfully",

`

<h2>

Hello ${name},

</h2>

<br/>

<p>

We're excited to have you
join our platform.

Your account setup
has been completed.

</p>

<div class="card">

<p>

Temporary Password

</p>

<div class="code">

${password}

</div>

</div>

<p>

For security reasons,
you'll be required
to update your password
during your first login.

</p>

<center>

<a
href="${process.env.APP_URL}"
class="button"
>

Login Now

</a>

</center>

`,

`linear-gradient(
135deg,
#4F46E5,
#7C3AED
)`

);


await this.transporter.sendMail({

from:process.env.EMAIL_USER,

to:email,

subject:
"🎉 Welcome to Our Platform",

html

});

}
catch(error){

console.log(
"sendTemporaryPassword error:",
error
);

throw error;

}

}



    // =======================================
    // OTP Email
    // =======================================

static async sendOtp(

email:string,
otp:string

){

try{

const html=

this.getTemplate(

"Email Verification 🔐",

"Secure access verification",

`

<p>

Use the OTP below
to continue.

</p>

<div class="card">

<div class="code">

${otp}

</div>

</div>

<p>

This OTP expires
in 5 minutes.

</p>

<p>

If you didn't request this,
please ignore this email.

</p>

`,

`linear-gradient(
135deg,
#0EA5E9,
#3B82F6
)`

);

await this.transporter.sendMail({

from:process.env.EMAIL_USER,

to:email,

subject:
"🔑 OTP Verification",

html

});

}
catch(error){

console.log(
"sendOtp error:",
error
);

throw error;

}

}



    // =======================================
    // Company Admin Email
    // =======================================

static async sendCompanyAdminCredentials(

email:string,
password:string,
token:string

){

try{

const verifyUrl=
`${process.env.APP_URL}/companies/verify/${token}`;

const html=

this.getTemplate(

"Company Admin Setup 🏢",

"Your administrator workspace is ready",

`

<p>

Congratulations!

Your administrator account
has been created successfully.

</p>

<div class="card">

<p>

Temporary Password

</p>

<div class="code">

${password}

</div>

</div>

<center>

<a
href="${verifyUrl}"
class="button"
>

Verify Email

</a>

</center>

<br/>

<p>

Password reset is mandatory
after your first login.

</p>

`,

`linear-gradient(
135deg,
#059669,
#10B981
)`

);

await this.transporter.sendMail({

from:process.env.EMAIL_USER,

to:email,

subject:
"🏢 Company Admin Account Created",

html

});

}
catch(error){

console.log(
"sendCompanyAdminCredentials error:",
error
);

throw error;

}

}

}