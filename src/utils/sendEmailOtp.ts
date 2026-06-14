import nodemailer from "nodemailer";

const sendEmailOtp = async (
  email: string,
  otp: number | string
): Promise<void> => {

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>

body{
  margin:0;
  padding:0;
  font-family:Arial,sans-serif;
  background:#f3f4f6;
}

.container{
  max-width:520px;
  margin:40px auto;
  background:#ffffff;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,0.1);
}

.header{
  padding:20px;
  text-align:center;
  background:linear-gradient(135deg,#6366f1,#22c55e);
  color:white;
}

.otp{
  margin:25px auto;
  width:180px;
  padding:18px;
  font-size:28px;
  font-weight:bold;
  letter-spacing:8px;
  text-align:center;
  color:#111827;
  background:#f3f4f6;
  border-radius:12px;
}

.footer{
  padding:15px;
  text-align:center;
  font-size:12px;
  color:#6b7280;
  background:#f9fafb;
}

</style>
</head>

<body>

<div class="container">

<div class="header">
<h2>OTP VERIFICATION</h2>
</div>

<div style="padding:30px;text-align:center">

<p>Hello 👋</p>

<p style="color:#6b7280;font-size:14px">
Use this OTP to verify your account
</p>

<div class="otp">
${otp}
</div>

<p style="color:#ef4444;font-weight:bold">
⚠ Valid for 2 minutes only
</p>

</div>

<div class="footer">
© ${new Date().getFullYear()} PJSV System
</div>

</div>

</body>
</html>
`;

  await transporter.sendMail({
    from: `"PJSV System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 OTP Verification Code",
    html,
  });
};

export default sendEmailOtp;