import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { generateQR } from "./qr";

export const generateInvoicePDF = async (order: any, company: any) => {

  const doc = new PDFDocument({ margin: 40 });

  const filePath = path.join(
    __dirname,
    `../../uploads/invoices/${order.invoice_no}.pdf`
  );

  doc.pipe(fs.createWriteStream(filePath));

  // HEADER
  doc.rect(0, 0, 600, 80).fill("#1F4E79");

  doc.fillColor("white").fontSize(18)
    .text(company.name, 40, 30);

  doc.fontSize(10)
    .text(`Invoice: ${order.invoice_no}`, 400, 30)
    .text(`Date: ${new Date().toDateString()}`, 400, 45);

  // COMPANY INFO
  doc.fillColor("black");
  doc.text(`Mobile: ${company.mobilenumber}`);
  doc.text(`Address: ${company.address}`);

  doc.moveDown();

  // ITEMS
  order.items.forEach((item: any, i: number) => {
    doc.text(`${i + 1}. ${item.product.name} x ${item.quantity} = ${item.price}`);
  });

  doc.moveDown();

  doc.text(`Subtotal: ${order.subtotal}`);
  doc.text(`Discount: ${order.discount}`);
  doc.text(`Total: ${order.total}`);

  // QR
  const qr = await generateQR(
    JSON.stringify({
      invoice: order.invoice_no,
      orderId: order.id,
    })
  );

  doc.image(qr, 450, 120, { width: 100 });

  doc.end();

  return filePath;
};