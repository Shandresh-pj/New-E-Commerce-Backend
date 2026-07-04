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

<html>

<head>

<meta charset="UTF-8"/>

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
/>

<style>

*{

margin:0;
padding:0;
box-sizing:border-box;

}

body{

background:#f4f7fc;
font-family:
Arial,
Helvetica,
sans-serif;

padding:20px;

}

.wrapper{

width:100%;

}

.container{

max-width:680px;
margin:auto;

background:white;

border-radius:24px;

overflow:hidden;

box-shadow:
0 15px 40px
rgba(0,0,0,.08);

}

.hero{

padding:60px 30px;

background:${gradient};

color:white;

text-align:center;

}

.hero h1{

font-size:34px;
margin-bottom:15px;

}

.hero p{

font-size:16px;

opacity:.9;

line-height:1.6;

}

.content{

padding:40px;

color:#444;

line-height:1.8;

}

.card{

background:
linear-gradient(
145deg,
#f8fafc,
#edf2f7
);

padding:30px;

border-radius:18px;

margin:25px 0;

text-align:center;

}

.code{

font-size:30px;
font-weight:bold;

letter-spacing:5px;

color:#5B67F1;

margin-top:10px;

word-break:break-word;

}

.button{

display:inline-block;

padding:15px 35px;

background:
linear-gradient(
90deg,
#5B67F1,
#8B5CF6
);

color:white!important;

font-weight:bold;

text-decoration:none;

border-radius:12px;

margin-top:25px;

}

.footer{

padding:25px;

background:#fafafa;

text-align:center;

font-size:13px;

color:#777;

}

.footer a{

text-decoration:none;

color:#5B67F1;

margin:0 10px;

}

@media screen and (max-width:600px){

.hero{

padding:40px 20px;

}

.hero h1{

font-size:28px;

}

.content{

padding:25px;

}

.card{

padding:20px;

}

.code{

font-size:24px;

}

.button{

display:block;

width:100%;

}

}

</style>

</head>

<body>

<div class="wrapper">

<div class="container">

<div class="hero">

<h1>

${title}

</h1>

<p>

${subtitle}

</p>

</div>

<div class="content">

${content}

</div>

<div class="footer">

<p>

© ${new Date().getFullYear()}
Your Company

</p>

<br/>

<a href="#">
Website
</a>

<a href="#">
LinkedIn
</a>

<a href="#">
Support
</a>

<br/><br/>

<p>

This email was generated automatically.
Please do not reply.

</p>

</div>

</div>

</div>

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