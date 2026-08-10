import { TemplateRenderer } from "./templateRenderer";
import { EmailProvider } from "../services/email.Provider";

export const sendInvoiceEmail = async (
  email: string,
  filePath: string,
  invoiceNo: string,
  customerName: string = 'Valued Customer',
  totalAmount: string | number = '0.00',
  invoiceUrl?: string
) => {
  const rawNum = typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount).replace(/[^0-9.]/g, '')) || 0;
  const formattedAmount = `₹${rawNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const html = TemplateRenderer.renderTemplate('invoice-receipt', {
      user_name: customerName,
      invoice_id: invoiceNo,
      amount: formattedAmount,
      invoice_url: invoiceUrl || `${frontendUrl}/orders/invoice-pdf/${invoiceNo}`
  });

  // Fire and forget sending with retry logic
  EmailProvider.sendWithRetry({
    to: email,
    subject: `Invoice #${invoiceNo} — SVK E-Commerce`,
    html: html,
    attachments: [
      {
        filename: `${invoiceNo}.pdf`,
        path: filePath,
      },
    ],
  }).catch(err => console.error("[Facade] Background invoice email error:", err.message));
};