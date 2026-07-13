import nodemailer from "nodemailer";
import { TemplateRenderer } from "./templateRenderer";

export const sendInvoiceEmail = async (
  email: string,
  filePath: string,
  invoiceNo: string
) => {

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const html = TemplateRenderer.renderTemplate('invoice-receipt', {
      user_name: 'Customer',
      invoice_id: invoiceNo,
      amount: 'See attached PDF',
      invoice_url: process.env.APP_URL || 'http://localhost:4200'
  });

  await transporter.sendMail({
    from: "Invoice System",
    to: email,
    subject: `Invoice ${invoiceNo}`,
    html: html,
    attachments: [
      {
        filename: `${invoiceNo}.pdf`,
        path: filePath,
      },
    ],
  });
};