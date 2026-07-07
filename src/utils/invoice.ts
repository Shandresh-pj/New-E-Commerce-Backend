import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { generateQRBuffer } from "./qr";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface InvoiceOptions {
  theme?: string;
  title?: string;
  gst?: string;
  notes?: string;
  branch?: string;
  taxRate?: number;
  currency?: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  rowAlt: string;
  textDark: string;
  textMid: string;
  textLight: string;
  pillPaid: { bg: string; fg: string };
  pillPending: { bg: string; fg: string };
  pillFailed: { bg: string; fg: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const THEMES: Record<string, ThemeColors> = {
  aurora: {
    primary: "#5b21b6",
    secondary: "#7c3aed",
    accent: "#06b6d4",
    headerBg: "#f5f3ff",
    rowAlt: "#faf5ff",
    textDark: "#1e1b4b",
    textMid: "#4c1d95",
    textLight: "#6b7280",
    pillPaid: { bg: "#d1fae5", fg: "#065f46" },
    pillPending: { bg: "#fef3c7", fg: "#92400e" },
    pillFailed: { bg: "#fee2e2", fg: "#991b1b" },
  },
  corporate: {
    primary: "#1e3a8a",
    secondary: "#2563eb",
    accent: "#0ea5e9",
    headerBg: "#eff6ff",
    rowAlt: "#f0f9ff",
    textDark: "#0f172a",
    textMid: "#1d4ed8",
    textLight: "#64748b",
    pillPaid: { bg: "#d1fae5", fg: "#065f46" },
    pillPending: { bg: "#fef3c7", fg: "#92400e" },
    pillFailed: { bg: "#fee2e2", fg: "#991b1b" },
  },
  obsidian: {
    primary: "#1c1917",
    secondary: "#b45309",
    accent: "#d97706",
    headerBg: "#fffbeb",
    rowAlt: "#fefce8",
    textDark: "#111827",
    textMid: "#92400e",
    textLight: "#6b7280",
    pillPaid: { bg: "#d1fae5", fg: "#065f46" },
    pillPending: { bg: "#fef3c7", fg: "#92400e" },
    pillFailed: { bg: "#fee2e2", fg: "#991b1b" },
  },
  green: {
    primary: "#064e3b",
    secondary: "#059669",
    accent: "#34d399",
    headerBg: "#ecfdf5",
    rowAlt: "#f0fdf4",
    textDark: "#022c22",
    textMid: "#065f46",
    textLight: "#6b7280",
    pillPaid: { bg: "#d1fae5", fg: "#065f46" },
    pillPending: { bg: "#fef3c7", fg: "#92400e" },
    pillFailed: { bg: "#fee2e2", fg: "#991b1b" },
  },
  classic: {
    primary: "#1e293b",
    secondary: "#334155",
    accent: "#64748b",
    headerBg: "#f1f5f9",
    rowAlt: "#f8fafc",
    textDark: "#0f172a",
    textMid: "#334155",
    textLight: "#6b7280",
    pillPaid: { bg: "#d1fae5", fg: "#065f46" },
    pillPending: { bg: "#fef3c7", fg: "#92400e" },
    pillFailed: { bg: "#fee2e2", fg: "#991b1b" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE METRICS
// ─────────────────────────────────────────────────────────────────────────────
const PW = 595.28;   // A4 width pts
const PH = 841.89;   // A4 height pts
const ML = 42;       // margin left
const MR = 42;       // margin right
const MT = 40;       // margin top
const COL_W = PW - ML - MR;   // usable column width

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: draw a filled rounded rectangle
// ─────────────────────────────────────────────────────────────────────────────
function roundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string,
  strokeColor?: string
) {
  doc.save();
  doc.roundedRect(x, y, w, h, r);
  if (strokeColor) {
    doc.fillAndStroke(fillColor, strokeColor);
  } else {
    doc.fill(fillColor);
  }
  doc.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: horizontal rule
// ─────────────────────────────────────────────────────────────────────────────
function hRule(doc: PDFKit.PDFDocument, y: number, color: string, dashed = false) {
  doc.save();
  if (dashed) doc.dash(3, { space: 3 });
  doc.strokeColor(color).lineWidth(0.5).moveTo(ML, y).lineTo(PW - MR, y).stroke();
  doc.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: status pill
// ─────────────────────────────────────────────────────────────────────────────
function drawStatusPill(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  textColor: string
) {
  const pw = 72, ph = 16, pr = 8;
  roundedRect(doc, x, y, pw, ph, pr, bgColor);
  doc
    .fillColor(textColor)
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(text, x, y + 4, { width: pw, align: "center" });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export const generateInvoicePDF = async (
  order: any,
  company: any,
  options: InvoiceOptions = {}
): Promise<string> => {

  // ── RESOLVE OPTIONS ──────────────────────────────────────────────────────
  const themeId   = options.theme     || "aurora";
  const t         = THEMES[themeId] || THEMES.aurora;
  const title     = (options.title    || "TAX INVOICE").toUpperCase();
  const gst       = options.gst       || company.gst_number || "N/A";
  const notes     = options.notes     || "Thank you for choosing BizCore Enterprise!";
  const branch    = options.branch    || "Main Branch";
  const taxRate   = options.taxRate   !== undefined ? Number(options.taxRate) : 18;
  const currency  = options.currency  || "₹";

  // ── DERIVED DATA ──────────────────────────────────────────────────────────
  const invoiceNo   = order.invoice_no   || "N/A";
  const createdAt   = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dueDate     = new Date(order.created_at || Date.now());
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr  = dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const companyName  = company.name      || "BizCore Enterprise";
  const companyEmail = company.email     || "N/A";
  const companyPhone = company.mobilenumber || company.phone || "N/A";
  const companyAddr  = company.address   || "N/A";
  const companyId    = company.company_id || company.id || "01";

  const customerName  = order.user?.name         || "Walk-in Customer";
  const customerEmail = order.user?.email        || "N/A";
  const customerPhone = order.user?.mobilenumber || "N/A";

  const statusStr    = (order.payment_status || "PENDING").toUpperCase();
  const payMethod    = (order.payment_method   || "CASH").toUpperCase();
  const txnId        = order.transaction_id    || "N/A";

  const items: any[] = order.items || [];
  const subtotal     = Number(order.subtotal)  || 0;
  const discount     = Number(order.discount)  || 0;
  const taxBase      = Math.max(0, subtotal - discount);
  const taxAmount    = taxBase * (taxRate / 100);
  const grandTotal   = Number(order.total)     || Math.max(0, taxBase + taxAmount);

  // ── STATUS PILL COLORS ───────────────────────────────────────────────────
  let pillColors = t.pillPending;
  if (["PAID", "COMPLETED", "SUCCESS"].includes(statusStr)) pillColors = t.pillPaid;
  if (["FAILED", "DECLINED", "REJECTED"].includes(statusStr))  pillColors = t.pillFailed;

  // ── QR CODE (PNG Buffer) ─────────────────────────────────────────────────
  // Encode a compact JSON payload that a scanner can verify via API
  const qrPayload = JSON.stringify({
    inv: invoiceNo,
    id:  order.id,
    co:  companyName,
    tot: grandTotal.toFixed(2),
    st:  statusStr,
  });
  const qrBuf = await generateQRBuffer(qrPayload);

  // ── FILE PATH ─────────────────────────────────────────────────────────────
  const invoiceDir = path.join(__dirname, "../../uploads/invoices");
  if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });
  const filePath = path.join(invoiceDir, `${invoiceNo}.pdf`);

  // ── CREATE DOCUMENT ───────────────────────────────────────────────────────
  const doc = new PDFDocument({
    margin: 0,
    size: "A4",
    info: {
      Title:    `Invoice ${invoiceNo}`,
      Author:   companyName,
      Subject:  "Tax Invoice",
      Keywords: "invoice, bizcore, enterprise",
    },
  });

  const ws = fs.createWriteStream(filePath);
  doc.pipe(ws);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — HERO HEADER  (gradient band + white card)
  // ══════════════════════════════════════════════════════════════════════════
  // Full-width gradient banner
  doc.rect(0, 0, PW, 120).fill(t.primary);
  // Decorative accent stripe at very top
  doc.rect(0, 0, PW, 5).fill(t.accent);

  // Hero text
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(30)
    .text(title, ML, MT + 12, { characterSpacing: 3 });

  doc
    .fillColor("rgba(255,255,255,0.55)")
    .font("Helvetica")
    .fontSize(8.5)
    .text("BIZCORE ENTERPRISE  ·  OFFICIAL DOCUMENT", ML, MT + 48, { characterSpacing: 1.5 });

  // Invoice # box (top-right)
  roundedRect(doc, PW - MR - 165, MT + 8, 165, 56, 8, "rgba(255,255,255,0.1)");
  doc
    .fillColor("rgba(255,255,255,0.6)")
    .font("Helvetica")
    .fontSize(7.5)
    .text("INVOICE NUMBER", PW - MR - 155, MT + 15);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(invoiceNo, PW - MR - 155, MT + 27);
  doc
    .fillColor("rgba(255,255,255,0.55)")
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Issued: ${createdAt}    Due: ${dueDateStr}`, PW - MR - 155, MT + 46);

  // White content card starts below banner
  let Y = 132;
  roundedRect(doc, ML - 4, Y, COL_W + 8, PH - Y - 28, 12, "#ffffff");
  Y += 20;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — PARTIES  (Issued By | Branch | Bill To | Payment)
  // ══════════════════════════════════════════════════════════════════════════
  const colW4 = Math.floor((COL_W - 24) / 4);
  const colXs = [ML, ML + colW4 + 8, ML + (colW4 + 8) * 2, ML + (colW4 + 8) * 3];

  // Section header strip
  roundedRect(doc, ML, Y, COL_W, 18, 4, t.headerBg);
  doc
    .fillColor(t.primary)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("ISSUED BY", colXs[0] + 4, Y + 5)
    .text("BRANCH LOCATION", colXs[1] + 4, Y + 5)
    .text("BILL TO", colXs[2] + 4, Y + 5)
    .text("PAYMENT DETAILS", colXs[3] + 4, Y + 5);
  Y += 22;

  // Column 1 — Company
  doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(companyName, colXs[0], Y, { width: colW4 });
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7.5)
    .text(`GSTIN: ${gst}`, colXs[0], Y + 13, { width: colW4 })
    .text(`Ph: ${companyPhone}`, colXs[0], Y + 23, { width: colW4 })
    .text(companyAddr, colXs[0], Y + 33, { width: colW4, lineGap: 1 })
    .text(companyEmail, colXs[0], Y + 50, { width: colW4 });

  // Column 2 — Branch
  doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(branch, colXs[1], Y, { width: colW4 });
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7.5)
    .text("Corporate Distribution", colXs[1], Y + 13, { width: colW4 })
    .text(`Branch ID: BR-${companyId}`, colXs[1], Y + 23, { width: colW4 })
    .text(`Admin: ${companyEmail}`, colXs[1], Y + 33, { width: colW4 });

  // Column 3 — Bill To
  doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(customerName, colXs[2], Y, { width: colW4 });
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Email: ${customerEmail}`, colXs[2], Y + 13, { width: colW4 })
    .text(`Phone: ${customerPhone}`, colXs[2], Y + 23, { width: colW4 });

  // Column 4 — Payment
  doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(payMethod, colXs[3], Y, { width: colW4 });
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7.5)
    .text(`TXN: ${txnId}`, colXs[3], Y + 13, { width: colW4 });

  // Status pill in col 4
  drawStatusPill(doc, colXs[3], Y + 26, statusStr, pillColors.bg, pillColors.fg);
  Y += 70;

  hRule(doc, Y, "#e5e7eb");
  Y += 12;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — ITEMS TABLE
  // ══════════════════════════════════════════════════════════════════════════
  // Column widths
  const TBL_NUM  = 26;
  const TBL_DESC = 195;
  const TBL_QTY  = 40;
  const TBL_UNIT = 80;
  const TBL_TAX  = 60;
  const TBL_AMT  = 80;
  const COL_SEP  = 6;
  const TBL_TOTAL_W = TBL_NUM + COL_SEP + TBL_DESC + COL_SEP + TBL_QTY + COL_SEP + TBL_UNIT + COL_SEP + TBL_TAX + COL_SEP + TBL_AMT;

  // Table header row
  roundedRect(doc, ML, Y, TBL_TOTAL_W, 20, 4, t.primary);
  const TH = { y: Y + 6, font: "Helvetica-Bold", size: 7.5, color: "#ffffff" };
  let tx = ML + 4;
  doc.fillColor(TH.color).font(TH.font).fontSize(TH.size);
  doc.text("#",          tx, TH.y, { width: TBL_NUM,  align: "center" }); tx += TBL_NUM  + COL_SEP;
  doc.text("DESCRIPTION",tx, TH.y, { width: TBL_DESC, align: "left"   }); tx += TBL_DESC + COL_SEP;
  doc.text("QTY",        tx, TH.y, { width: TBL_QTY,  align: "center" }); tx += TBL_QTY  + COL_SEP;
  doc.text(`UNIT (${currency})`, tx, TH.y, { width: TBL_UNIT, align: "right"  }); tx += TBL_UNIT + COL_SEP;
  doc.text(`TAX (${taxRate}%)`, tx, TH.y, { width: TBL_TAX,  align: "right"  }); tx += TBL_TAX  + COL_SEP;
  doc.text(`AMOUNT (${currency})`, tx, TH.y, { width: TBL_AMT, align: "right" });
  Y += 20;

  // Item rows — handle overflow with addPage()
  items.forEach((item: any, idx: number) => {
    const rowH = 22;

    // If near bottom of page, start new page
    if (Y + rowH + 120 > PH - 28) {
      doc.addPage();
      Y = 36;
      // Re-draw table header on new page
      roundedRect(doc, ML, Y, TBL_TOTAL_W, 20, 4, t.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(TH.size);
      let nx = ML + 4;
      doc.text("#",          nx, Y + 6, { width: TBL_NUM,  align: "center" }); nx += TBL_NUM  + COL_SEP;
      doc.text("DESCRIPTION",nx, Y + 6, { width: TBL_DESC, align: "left"   }); nx += TBL_DESC + COL_SEP;
      doc.text("QTY",        nx, Y + 6, { width: TBL_QTY,  align: "center" }); nx += TBL_QTY  + COL_SEP;
      doc.text(`UNIT (${currency})`, nx, Y + 6, { width: TBL_UNIT, align: "right" }); nx += TBL_UNIT + COL_SEP;
      doc.text(`TAX (${taxRate}%)`, nx, Y + 6, { width: TBL_TAX, align: "right" }); nx += TBL_TAX + COL_SEP;
      doc.text(`AMOUNT (${currency})`, nx, Y + 6, { width: TBL_AMT, align: "right" });
      Y += 20;
    }

    // Alternate row background
    const rowBg = idx % 2 === 0 ? "#ffffff" : t.rowAlt;
    doc.rect(ML, Y, TBL_TOTAL_W, rowH).fill(rowBg);

    const pName   = item.product?.name || `Product #${item.product_id}`;
    const qty     = Number(item.quantity) || 1;
    const price   = Number(item.price)    || 0;
    const itemTax = price * qty * (taxRate / 100);
    const amt     = price * qty;

    let rx = ML + 4;
    doc.fillColor(t.textDark).font("Helvetica").fontSize(8);
    doc.text(String(idx + 1), rx, Y + 7, { width: TBL_NUM, align: "center" }); rx += TBL_NUM + COL_SEP;
    doc.font("Helvetica-Bold").text(pName, rx, Y + 7, { width: TBL_DESC, ellipsis: true }); rx += TBL_DESC + COL_SEP;
    doc.font("Helvetica").text(String(qty), rx, Y + 7, { width: TBL_QTY, align: "center" }); rx += TBL_QTY + COL_SEP;
    doc.text(price.toFixed(2), rx, Y + 7, { width: TBL_UNIT, align: "right" }); rx += TBL_UNIT + COL_SEP;
    doc.fillColor(t.textLight).text(itemTax.toFixed(2), rx, Y + 7, { width: TBL_TAX, align: "right" }); rx += TBL_TAX + COL_SEP;
    doc.fillColor(t.textDark).font("Helvetica-Bold").text(amt.toFixed(2), rx, Y + 7, { width: TBL_AMT, align: "right" });

    // Bottom row separator
    hRule(doc, Y + rowH, "#e5e7eb");
    Y += rowH;
  });

  Y += 16;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — TOTALS + QR SIDE-BY-SIDE
  // ══════════════════════════════════════════════════════════════════════════
  // If not enough room, add a new page
  if (Y + 170 > PH - 28) {
    doc.addPage();
    Y = 36;
  }

  const TOTALS_X  = ML + 210;
  const TOTALS_W  = 170;
  const QR_SIZE   = 100;
  const QR_X      = TOTALS_X + TOTALS_W + 18;
  const QR_Y      = Y;

  // QR code (real PNG buffer — scannable!)
  doc.image(qrBuf, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
  roundedRect(doc, QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4, 4, "transparent", "#e5e7eb");
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(6.5)
    .text("Scan QR to verify", QR_X, QR_Y + QR_SIZE + 5, { width: QR_SIZE, align: "center" });

  // Totals card
  roundedRect(doc, TOTALS_X, Y, TOTALS_W, 102, 6, t.headerBg);
  const TR = {
    lx: TOTALS_X + 10,
    rx: TOTALS_X + TOTALS_W - 10,
    w:  TOTALS_W - 20,
  };

  function totalsRow(label: string, value: string, bold = false, ry: number) {
    doc
      .fillColor(t.textLight)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .text(label, TR.lx, ry, { width: TR.w / 2 });
    doc
      .fillColor(t.textDark)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .text(value, TR.lx + TR.w / 2, ry, { width: TR.w / 2, align: "right" });
  }

  totalsRow("Subtotal:",                    `${currency} ${subtotal.toFixed(2)}`,                    false, Y + 10);
  totalsRow(`Discount:`,                    `- ${currency} ${discount.toFixed(2)}`,                   false, Y + 24);
  totalsRow(`Tax @ ${taxRate}%:`,           `${currency} ${taxAmount.toFixed(2)}`,                    false, Y + 38);
  hRule(doc, Y + 52, t.accent);

  // Grand Total banner
  roundedRect(doc, TOTALS_X, Y + 56, TOTALS_W, 28, 6, t.primary);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("GRAND TOTAL", TOTALS_X + 10, Y + 64, { width: TR.w / 2 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`${currency} ${grandTotal.toFixed(2)}`, TOTALS_X + 10 + TR.w / 2, Y + 64, { width: TR.w / 2, align: "right" });

  // Words below total
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7)
    .text(`Amount payable in ${payMethod}`, TOTALS_X, Y + 90, { width: TOTALS_W, align: "center" });

  Y += 118;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — NOTES, SIGNATURE & TERMS  (bottom block)
  // ══════════════════════════════════════════════════════════════════════════
  if (Y + 80 > PH - 28) {
    doc.addPage();
    Y = 36;
  }

  hRule(doc, Y, t.accent, true);
  Y += 12;

  // Notes (left)
  doc
    .fillColor(t.primary)
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text("CUSTOMER NOTE & TERMS", ML, Y);
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7.5)
    .text(notes, ML, Y + 12, { width: 260, lineGap: 2 });

  // Signature block (right)
  const SIGN_X = PW - MR - 140;
  hRule(doc, Y + 50, "#d1d5db");
  doc
    .fillColor(t.textLight)
    .font("Helvetica")
    .fontSize(7)
    .text("AUTHORISED SIGNATORY", SIGN_X, Y + 54, { width: 140, align: "center" });

  Y += 80;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — PAGE FOOTER (every page via addPage event is complex with pdfkit,
  //             so we draw it at the absolute bottom of the last content area)
  // ══════════════════════════════════════════════════════════════════════════
  const FOOTER_Y = PH - 26;
  doc.rect(0, FOOTER_Y - 8, PW, 34).fill(t.primary);
  doc.rect(0, FOOTER_Y - 8, PW, 3).fill(t.accent);
  doc
    .fillColor("rgba(255,255,255,0.6)")
    .font("Helvetica")
    .fontSize(7)
    .text(
      `${companyName}  ·  ${companyEmail}  ·  ${companyPhone}  ·  GSTIN: ${gst}`,
      0,
      FOOTER_Y + 2,
      { width: PW, align: "center" }
    );
  doc
    .fillColor("rgba(255,255,255,0.35)")
    .font("Helvetica")
    .fontSize(6.5)
    .text(
      `Invoice ${invoiceNo}  ·  Generated by Invoice Studio`,
      0,
      FOOTER_Y + 13,
      { width: PW, align: "center" }
    );

  // ══════════════════════════════════════════════════════════════════════════
  // FINALISE
  // ══════════════════════════════════════════════════════════════════════════
  doc.end();

  return new Promise<string>((resolve, reject) => {
    ws.on("finish", () => resolve(filePath));
    ws.on("error",  (err) => reject(err));
  });
};