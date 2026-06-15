import nodemailer from "nodemailer";

export const sendInvoiceEmail = async (
  email: string,
  filePath: string,
  invoiceNo: string
) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: "Invoice System <no-reply@company.com>",
    to: email,
    subject: `Invoice ${invoiceNo}`,
    text: "Please find attached invoice.",
    attachments: [
      {
        filename: `${invoiceNo}.pdf`,
        path: filePath,
      },
    ],
  });
};