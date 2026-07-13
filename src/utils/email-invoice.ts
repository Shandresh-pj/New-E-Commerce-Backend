import { TemplateRenderer } from "./templateRenderer";
import { EmailProvider } from "../services/email.Provider";

export const sendInvoiceEmail = async (
  email: string,
  filePath: string,
  invoiceNo: string
) => {
  const html = TemplateRenderer.renderTemplate('invoice-receipt', {
      user_name: 'Customer',
      invoice_id: invoiceNo,
      amount: 'See attached PDF',
      invoice_url: process.env.FRONTEND_URL || 'http://localhost:4200'
  });

  // Fire and forget sending with retry logic
  EmailProvider.sendWithRetry({
    from: `"Invoice System" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
    to: email,
    subject: `Invoice ${invoiceNo}`,
    html: html,
    attachments: [
      {
        filename: `${invoiceNo}.pdf`,
        path: filePath,
      },
    ],
  }).catch(err => console.error("[Facade] Background invoice email error:", err.message));
};