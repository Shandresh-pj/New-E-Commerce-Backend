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
// THEME REGISTRY — each theme (besides the "aurora" fallback) now drives its
// own distinct PDF layout below, not just a colour swap of a shared one.
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
// PREMIUM PALETTE — the "premium" theme gets a fully redesigned letterhead
// layout (see drawing code below), not just a colour swap of the standard one.
// ─────────────────────────────────────────────────────────────────────────────
const PREMIUM = {
  ivory: "#fffdf6",
  cream: "#f8f2df",
  ink: "#14110f",
  gold: "#b8902c",
  goldLight: "#d9b65a",
  hair: "#e7ddc0",
  textDark: "#221d12",
  textMid: "#5c4d24",
  textLight: "#8a7f68",
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
// HELPER: border-only rounded rectangle (no fill)
// ─────────────────────────────────────────────────────────────────────────────
function strokeRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  lineWidth = 0.75
) {
  doc.save();
  doc.lineWidth(lineWidth).strokeColor(color);
  doc.roundedRect(x, y, w, h, r).stroke();
  doc.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: horizontal rule
// ─────────────────────────────────────────────────────────────────────────────
function hRule(doc: PDFKit.PDFDocument, y: number, color: string, dashed = false, x1 = ML, x2 = PW - MR) {
  doc.save();
  if (dashed) doc.dash(3, { space: 3 });
  doc.strokeColor(color).lineWidth(0.5).moveTo(x1, y).lineTo(x2, y).stroke();
  doc.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: vertical rule
// ─────────────────────────────────────────────────────────────────────────────
function vRule(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, color: string, lineWidth = 0.6) {
  doc.save();
  doc.strokeColor(color).lineWidth(lineWidth).moveTo(x, y1).lineTo(x, y2).stroke();
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
  textColor: string,
  width = 72
) {
  const pw = width, ph = 16, pr = 8;
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

  switch (themeId) {

    // ════════════════════════════════════════════════════════════════════
    // PREMIUM ELITE — letterhead style: no colour-filled bands, thin gold
    // rules/borders, serif typography.
    // ════════════════════════════════════════════════════════════════════
    case "premium": {
      const ink    = PREMIUM.ink;
      const gold   = PREMIUM.gold;
      const goldL  = PREMIUM.goldLight;
      const cream  = PREMIUM.cream;
      const hair   = PREMIUM.hair;
      const tDark  = PREMIUM.textDark;
      const tMid   = PREMIUM.textMid;
      const tLight = PREMIUM.textLight;

      const paintPageBase = () => {
        doc.rect(0, 0, PW, PH).fill(PREMIUM.ivory);
        doc.rect(0, 0, PW, 3).fill(gold);
        doc.rect(0, 4, PW, 1).fill(goldL);
      };
      paintPageBase();

      let Y = MT + 6;

      // ── LETTERHEAD ──
      doc.fillColor(ink).font("Times-Bold").fontSize(23).text(companyName, ML, Y, { characterSpacing: 0.3 });
      doc.fillColor(tLight).font("Times-Roman").fontSize(8.5)
        .text(`GSTIN ${gst}  ·  ${companyEmail}  ·  ${companyPhone}`, ML, Y + 27);

      const boxW = 168, boxH = 58;
      const boxX = PW - MR - boxW, boxY = Y - 4;
      strokeRect(doc, boxX, boxY, boxW, boxH, 3, gold, 0.9);
      doc.fillColor(gold).font("Helvetica-Bold").fontSize(7.5)
        .text(title, boxX, boxY + 8, { width: boxW, align: "center", characterSpacing: 2 });
      doc.fillColor(ink).font("Times-Bold").fontSize(14)
        .text(invoiceNo, boxX, boxY + 20, { width: boxW, align: "center" });
      doc.fillColor(tLight).font("Helvetica").fontSize(7.5)
        .text(`Issued ${createdAt}   ·   Due ${dueDateStr}`, boxX, boxY + 40, { width: boxW, align: "center" });

      Y += 58;
      hRule(doc, Y, hair);
      Y += 6;
      hRule(doc, Y, gold);
      Y += 18;

      // ── PARTIES (2-col, divided by vertical hairline) ──
      const halfW  = (COL_W - 30) / 2;
      const leftX  = ML;
      const rightX = ML + halfW + 30;

      doc.fillColor(gold).font("Helvetica-Bold").fontSize(7.5).text("BILLED FROM", leftX, Y, { characterSpacing: 1.4 });
      doc.fillColor(gold).font("Helvetica-Bold").fontSize(7.5).text("BILLED TO", rightX, Y, { characterSpacing: 1.4 });
      Y += 14;

      doc.fillColor(tDark).font("Times-Bold").fontSize(11).text(companyName, leftX, Y, { width: halfW });
      doc.fillColor(tDark).font("Times-Bold").fontSize(11).text(customerName, rightX, Y, { width: halfW });
      Y += 15;

      doc.fillColor(tMid).font("Times-Roman").fontSize(8.5)
        .text(`${companyAddr}`, leftX, Y, { width: halfW, lineGap: 1.5 })
        .text(`Branch: ${branch}  ·  BR-${companyId}`, leftX, Y + 22, { width: halfW });
      doc.fillColor(tMid).font("Times-Roman").fontSize(8.5)
        .text(customerEmail, rightX, Y, { width: halfW })
        .text(customerPhone, rightX, Y + 12, { width: halfW });

      vRule(doc, ML + halfW + 15, Y - 20, Y + 40, hair);

      Y += 50;

      // ── META STRIP (3 bordered cells, no fill) ──
      const cellW = (COL_W - 16) / 3;
      const cellY = Y;
      const cellH = 34;
      const cells: [string, string, string][] = [
        ["PAYMENT METHOD", payMethod, tDark],
        ["TRANSACTION ID", txnId, tDark],
        ["STATUS", statusStr, pillColors.fg],
      ];
      cells.forEach(([label, value, color], idx) => {
        const cx = ML + idx * (cellW + 8);
        strokeRect(doc, cx, cellY, cellW, cellH, 3, hair, 0.7);
        doc.fillColor(tLight).font("Helvetica-Bold").fontSize(6.5).text(label, cx + 8, cellY + 7, { characterSpacing: 0.8 });
        doc.fillColor(color).font("Helvetica-Bold").fontSize(9).text(value, cx + 8, cellY + 18, { width: cellW - 16, height: 11, ellipsis: true });
      });

      Y += cellH + 20;

      // ── ITEMS TABLE (double gold/hairline rule instead of a filled header) ──
      const TBL_NUM = 24, TBL_DESC = 205, TBL_QTY = 40, TBL_UNIT = 78, TBL_TAX = 58, TBL_AMT = 82, SEP = 6;
      const TBL_W = TBL_NUM + SEP + TBL_DESC + SEP + TBL_QTY + SEP + TBL_UNIT + SEP + TBL_TAX + SEP + TBL_AMT;

      const premiumTableHeader = (yy: number) => {
        doc.save().strokeColor(gold).lineWidth(1.1).moveTo(ML, yy).lineTo(ML + TBL_W, yy).stroke().restore();
        let tx = ML;
        doc.fillColor(ink).font("Helvetica-Bold").fontSize(7.5);
        doc.text("#", tx, yy + 6, { width: TBL_NUM, align: "center" }); tx += TBL_NUM + SEP;
        doc.text("ITEM / DESCRIPTION", tx, yy + 6, { width: TBL_DESC }); tx += TBL_DESC + SEP;
        doc.text("QTY", tx, yy + 6, { width: TBL_QTY, align: "center" }); tx += TBL_QTY + SEP;
        doc.text(`UNIT (${currency})`, tx, yy + 6, { width: TBL_UNIT, align: "right" }); tx += TBL_UNIT + SEP;
        doc.text(`TAX (${taxRate}%)`, tx, yy + 6, { width: TBL_TAX, align: "right" }); tx += TBL_TAX + SEP;
        doc.text(`AMOUNT (${currency})`, tx, yy + 6, { width: TBL_AMT, align: "right" });
        doc.save().strokeColor(hair).lineWidth(0.6).moveTo(ML, yy + 22).lineTo(ML + TBL_W, yy + 22).stroke().restore();
      };

      premiumTableHeader(Y);
      Y += 26;

      items.forEach((item: any, idx: number) => {
        const rowH = 24;

        if (Y + rowH + 150 > PH - 30) {
          doc.addPage();
          paintPageBase();
          Y = 36;
          premiumTableHeader(Y);
          Y += 26;
        }

        if (idx % 2 !== 0) doc.rect(ML, Y, TBL_W, rowH).fill(cream);

        const pName   = item.product?.name || `Product #${item.product_id}`;
        const qty     = Number(item.quantity) || 1;
        const price   = Number(item.price)    || 0;
        const itemTax = price * qty * (taxRate / 100);
        const amt     = price * qty;

        let rx = ML;
        doc.fillColor(tLight).font("Helvetica").fontSize(8).text(String(idx + 1), rx, Y + 7, { width: TBL_NUM, align: "center" }); rx += TBL_NUM + SEP;
        doc.fillColor(tDark).font("Times-Bold").fontSize(9).text(pName, rx, Y + 6, { width: TBL_DESC, height: 11, ellipsis: true }); rx += TBL_DESC + SEP;
        doc.fillColor(tMid).font("Helvetica").fontSize(8).text(String(qty), rx, Y + 7, { width: TBL_QTY, align: "center" }); rx += TBL_QTY + SEP;
        doc.fillColor(tDark).font("Helvetica").fontSize(8).text(price.toFixed(2), rx, Y + 7, { width: TBL_UNIT, align: "right" }); rx += TBL_UNIT + SEP;
        doc.fillColor(tLight).text(itemTax.toFixed(2), rx, Y + 7, { width: TBL_TAX, align: "right" }); rx += TBL_TAX + SEP;
        doc.fillColor(ink).font("Times-Bold").fontSize(9).text(amt.toFixed(2), rx, Y + 7, { width: TBL_AMT, align: "right" });

        hRule(doc, Y + rowH, hair);
        Y += rowH;
      });

      Y += 18;

      // ── NOTES (quote-styled) + TOTALS (bordered, no fill) + QR ──
      if (Y + 160 > PH - 30) {
        doc.addPage();
        paintPageBase();
        Y = 36;
      }

      const QR_SIZE  = 92;
      const TOTALS_W = 170;
      const NOTES_W  = 220;
      const QR_X     = PW - MR - QR_SIZE;
      const TOTALS_X = QR_X - TOTALS_W - 20;

      doc.fillColor(goldL).font("Times-BoldItalic").fontSize(30).text('"', ML - 4, Y - 10);
      doc.fillColor(tMid).font("Times-Italic").fontSize(8.5).text(notes, ML + 14, Y + 6, { width: NOTES_W, lineGap: 2.5 });
      const sigY = Y + 74;
      hRule(doc, sigY, hair, false, ML, ML + 150);
      doc.fillColor(tLight).font("Helvetica").fontSize(7).text("AUTHORISED SIGNATORY", ML, sigY + 5, { characterSpacing: 1 });
      doc.fillColor(tDark).font("Times-Bold").fontSize(8.5).text(companyName, ML, sigY + 15);

      let ty = Y;
      const pRow = (label: string, value: string, ry: number) => {
        doc.fillColor(tLight).font("Helvetica").fontSize(8.5).text(label, TOTALS_X, ry, { width: TOTALS_W * 0.55 });
        doc.fillColor(tDark).font("Helvetica").fontSize(8.5).text(value, TOTALS_X + TOTALS_W * 0.4, ry, { width: TOTALS_W * 0.6, align: "right" });
      };
      pRow("Subtotal",           `${currency} ${subtotal.toFixed(2)}`,  ty); ty += 16;
      pRow("Discount",           `- ${currency} ${discount.toFixed(2)}`, ty); ty += 16;
      pRow(`Tax @ ${taxRate}%`,  `${currency} ${taxAmount.toFixed(2)}`, ty); ty += 16;

      hRule(doc, ty + 2, gold, false, TOTALS_X, TOTALS_X + TOTALS_W);
      ty += 10;

      strokeRect(doc, TOTALS_X, ty, TOTALS_W, 32, 3, gold, 1.1);
      doc.fillColor(ink).font("Times-Bold").fontSize(9).text("GRAND TOTAL", TOTALS_X + 10, ty + 10, { width: TOTALS_W * 0.5 });
      doc.fillColor(ink).font("Times-Bold").fontSize(11).text(`${currency} ${grandTotal.toFixed(2)}`, TOTALS_X + TOTALS_W * 0.4, ty + 9, { width: TOTALS_W * 0.6 - 10, align: "right" });

      strokeRect(doc, QR_X - 3, Y - 3, QR_SIZE + 6, QR_SIZE + 6, 4, gold, 1);
      doc.image(qrBuf, QR_X, Y, { width: QR_SIZE, height: QR_SIZE });
      doc.fillColor(tLight).font("Helvetica").fontSize(6.5).text("Scan to verify", QR_X, Y + QR_SIZE + 8, { width: QR_SIZE, align: "center" });

      Y += 140;

      // ── FOOTER (double gold/hairline rule, centred small caps) ──
      if (Y + 40 > PH - 30) {
        doc.addPage();
        paintPageBase();
      }
      const footY = PH - 34;
      hRule(doc, footY, gold, false, ML, PW - MR);
      hRule(doc, footY + 3, hair, false, ML, PW - MR);
      doc.fillColor(tMid).font("Helvetica-Bold").fontSize(7.5)
        .text(`${companyName}   ·   GSTIN ${gst}`, 0, footY + 10, { width: PW, align: "center", characterSpacing: 0.5 });
      doc.fillColor(tLight).font("Helvetica").fontSize(6.5)
        .text(`Invoice ${invoiceNo}   ·   Crafted with BizCore Premium`, 0, footY + 22, { width: PW, align: "center" });

      break;
    }

    // ════════════════════════════════════════════════════════════════════
    // CORPORATE NAVY — bank-statement ledger: two-tier banner, boxed party
    // cells, vertical column dividers in the table, a boxed statement total.
    // ════════════════════════════════════════════════════════════════════
    case "corporate": {
      // ── TWO-TIER BAND ──
      doc.rect(0, 0, PW, 62).fill(t.primary);
      doc.rect(0, 62, PW, 30).fill(t.secondary);

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15).text(companyName, ML, 22);
      const ribbonW = 110, ribbonH = 22;
      strokeRect(doc, PW - MR - ribbonW, 20, ribbonW, ribbonH, 3, t.accent, 1.2);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9)
        .text(title, PW - MR - ribbonW, 27, { width: ribbonW, align: "center", characterSpacing: 1.5 });

      const subCellW = COL_W / 4;
      const subCells: [string, string][] = [
        ["INVOICE NO.", invoiceNo],
        ["ISSUE DATE", createdAt],
        ["BRANCH", branch],
        ["GSTIN", gst],
      ];
      subCells.forEach(([label, value], idx) => {
        const cx = ML + idx * subCellW;
        doc.fillColor("rgba(255,255,255,0.6)").font("Helvetica-Bold").fontSize(6.5).text(label, cx, 68, { characterSpacing: 0.8 });
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(value, cx, 78, { width: subCellW - 8, height: 11, ellipsis: true });
        if (idx > 0) vRule(doc, cx - 4, 66, 88, "rgba(255,255,255,0.2)");
      });

      let Y = 108;

      // ── PARTIES (3 bordered boxes with a coloured tab) ──
      const colGap = 12;
      const colW3 = (COL_W - colGap * 2) / 3;
      const partyData: [string, string, string[]][] = [
        ["BILL FROM", companyName, [companyAddr, companyEmail]],
        ["BILL TO", customerName, [customerEmail, customerPhone]],
        ["PAYMENT", payMethod, [`TXN: ${txnId}`]],
      ];
      partyData.forEach(([tab, name, lines], idx) => {
        const cx = ML + idx * (colW3 + colGap);
        const boxH = 62;
        strokeRect(doc, cx, Y, colW3, boxH, 4, t.primary + "55", 0.8);
        doc.rect(cx, Y, colW3, 16).fill(t.primary);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7).text(tab, cx + 8, Y + 5, { characterSpacing: 1 });
        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(name, cx + 8, Y + 21, { width: colW3 - 16 });
        doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(lines.join("  ·  "), cx + 8, Y + 33, { width: colW3 - 16, lineGap: 1.5 });
        if (idx === 2) drawStatusPill(doc, cx + 8, Y + boxH - 20, statusStr, pillColors.bg, pillColors.fg, 60);
      });

      Y += 62 + 18;

      // ── ITEMS TABLE (vertical column dividers, boxed) ──
      const TBL_NUM = 26, TBL_DESC = 190, TBL_QTY = 40, TBL_UNIT = 80, TBL_TAX = 60, TBL_AMT = 80, SEP = 0;
      const cols = [TBL_NUM, TBL_DESC, TBL_QTY, TBL_UNIT, TBL_TAX, TBL_AMT];
      const TBL_W = cols.reduce((a, b) => a + b, 0);
      const colX: number[] = [];
      { let acc = ML; for (const w of cols) { colX.push(acc); acc += w; } }

      const drawCorpHeader = (yy: number) => {
        doc.rect(ML, yy, TBL_W, 20).fill(t.primary);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("#", colX[0] + 4, yy + 6, { width: TBL_NUM - 4, align: "center" });
        doc.text("DESCRIPTION", colX[1] + 4, yy + 6, { width: TBL_DESC - 4 });
        doc.text("QTY", colX[2] + 4, yy + 6, { width: TBL_QTY - 4, align: "center" });
        doc.text(`UNIT (${currency})`, colX[3] + 4, yy + 6, { width: TBL_UNIT - 4, align: "right" });
        doc.text(`TAX (${taxRate}%)`, colX[4] + 4, yy + 6, { width: TBL_TAX - 4, align: "right" });
        doc.text(`AMOUNT (${currency})`, colX[5] + 4, yy + 6, { width: TBL_AMT - 4, align: "right" });
      };
      drawCorpHeader(Y);
      Y += 20;
      const tableTop = Y - 20;

      items.forEach((item: any, idx: number) => {
        const rowH = 22;
        if (Y + rowH + 130 > PH - 28) {
          doc.addPage();
          Y = 36;
          drawCorpHeader(Y);
          Y += 20;
        }
        const rowBg = idx % 2 === 0 ? "#ffffff" : t.rowAlt;
        doc.rect(ML, Y, TBL_W, rowH).fill(rowBg);

        const pName   = item.product?.name || `Product #${item.product_id}`;
        const qty     = Number(item.quantity) || 1;
        const price   = Number(item.price)    || 0;
        const itemTax = price * qty * (taxRate / 100);
        const amt     = price * qty;

        doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(String(idx + 1), colX[0] + 4, Y + 7, { width: TBL_NUM - 4, align: "center" });
        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(8).text(pName, colX[1] + 4, Y + 7, { width: TBL_DESC - 8, height: 10, ellipsis: true });
        doc.fillColor(t.textDark).font("Helvetica").text(String(qty), colX[2] + 4, Y + 7, { width: TBL_QTY - 4, align: "center" });
        doc.text(price.toFixed(2), colX[3] + 4, Y + 7, { width: TBL_UNIT - 8, align: "right" });
        doc.fillColor(t.textLight).text(itemTax.toFixed(2), colX[4] + 4, Y + 7, { width: TBL_TAX - 8, align: "right" });
        doc.fillColor(t.textDark).font("Helvetica-Bold").text(amt.toFixed(2), colX[5] + 4, Y + 7, { width: TBL_AMT - 8, align: "right" });

        hRule(doc, Y + rowH, "#e5e7eb", false, ML, ML + TBL_W);
        Y += rowH;
      });

      // Table border + vertical dividers
      strokeRect(doc, ML, tableTop, TBL_W, Y - tableTop, 0, t.primary + "55", 1);
      for (let i = 1; i < colX.length; i++) vRule(doc, colX[i], tableTop, Y, "rgba(0,0,0,.08)");

      Y += 16;

      // ── NOTES + BOXED STATEMENT TOTALS + QR ──
      if (Y + 150 > PH - 28) { doc.addPage(); Y = 36; }

      const TOTALS_X = ML + 210, TOTALS_W = 170;
      const QR_SIZE = 86, QR_X = TOTALS_X + TOTALS_W + 18;

      strokeRect(doc, ML, Y, 195, 100, 4, t.primary + "33", 0.8);
      doc.fillColor(t.primary).font("Helvetica-Bold").fontSize(7.5).text("TERMS & NOTES", ML + 10, Y + 10, { characterSpacing: 0.8 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(notes, ML + 10, Y + 22, { width: 175, lineGap: 2 });
      hRule(doc, Y + 78, "#d1d5db", false, ML + 10, ML + 150);
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7).text("Authorised Signatory", ML + 10, Y + 82, { width: 140 });

      strokeRect(doc, TOTALS_X, Y, TOTALS_W, 96, 4, t.primary + "55", 1);
      const trow = (label: string, value: string, ry: number) => {
        doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(label, TOTALS_X + 10, ry, { width: TOTALS_W / 2 - 10 });
        doc.fillColor(t.textDark).font("Helvetica").fontSize(8).text(value, TOTALS_X + TOTALS_W / 2, ry, { width: TOTALS_W / 2 - 10, align: "right" });
        hRule(doc, ry + 14, "#e5e7eb", false, TOTALS_X + 6, TOTALS_X + TOTALS_W - 6);
      };
      trow("Subtotal", `${currency} ${subtotal.toFixed(2)}`, Y + 10);
      trow("Discount", `- ${currency} ${discount.toFixed(2)}`, Y + 26);
      trow(`Tax @ ${taxRate}%`, `${currency} ${taxAmount.toFixed(2)}`, Y + 42);
      doc.rect(TOTALS_X, Y + 68, TOTALS_W, 28).fill(t.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("GRAND TOTAL", TOTALS_X + 10, Y + 76, { width: TOTALS_W / 2 });
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(`${currency} ${grandTotal.toFixed(2)}`, TOTALS_X + TOTALS_W / 2, Y + 76, { width: TOTALS_W / 2 - 10, align: "right" });

      strokeRect(doc, QR_X - 2, Y - 2, QR_SIZE + 4, QR_SIZE + 4, 0, t.primary);
      doc.image(qrBuf, QR_X, Y, { width: QR_SIZE, height: QR_SIZE });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(6.5).text("Scan to verify", QR_X, Y + QR_SIZE + 6, { width: QR_SIZE, align: "center" });

      Y += 116;

      // ── 3-COLUMN FOOTER BAND ──
      if (Y + 40 > PH - 4) { doc.addPage(); Y = 36; }
      const footY = PH - 40;
      doc.rect(0, footY, PW, 40).fill(t.primary);
      const footCellW = COL_W / 3;
      const footData: [string, string][] = [
        ["COMPANY", companyName],
        ["CONTACT", companyEmail],
        ["GSTIN", gst],
      ];
      footData.forEach(([label, value], idx) => {
        const cx = ML + idx * footCellW;
        doc.fillColor("rgba(255,255,255,0.5)").font("Helvetica-Bold").fontSize(6.5).text(label, cx, footY + 10, { characterSpacing: 0.8 });
        doc.fillColor("#ffffff").font("Helvetica").fontSize(8).text(value, cx, footY + 20, { width: footCellW - 10 });
      });

      break;
    }

    // ════════════════════════════════════════════════════════════════════
    // LUXURY OBSIDIAN — centred boutique-receipt: single column, dotted
    // item leaders instead of a table, copper rules around the total.
    // ════════════════════════════════════════════════════════════════════
    case "obsidian": {
      const paintPage = () => doc.rect(0, 0, PW, PH).fill(t.primary);
      paintPage();

      const cx = PW / 2;
      let Y = 60;

      strokeRect(doc, cx - 27, Y, 54, 54, 27, t.accent, 1.2);
      doc.fillColor(t.accent).font("Helvetica-Bold").fontSize(22).text(companyName.charAt(0), cx - 27, Y + 14, { width: 54, align: "center" });
      Y += 68;

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(companyName, 0, Y, { width: PW, align: "center", characterSpacing: 1 });
      Y += 20;
      doc.fillColor("rgba(255,255,255,0.45)").font("Helvetica").fontSize(8).text(`${gst}  ·  ${companyEmail}`, 0, Y, { width: PW, align: "center" });
      Y += 20;

      hRule(doc, Y, t.accent, false, cx - 45, cx + 45); Y += 16;
      doc.fillColor(t.accent).font("Helvetica-Bold").fontSize(9).text(title, 0, Y, { width: PW, align: "center", characterSpacing: 3 }); Y += 14;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(19).text(invoiceNo, 0, Y, { width: PW, align: "center" }); Y += 22;
      doc.fillColor("rgba(255,255,255,0.4)").font("Helvetica").fontSize(8).text(createdAt, 0, Y, { width: PW, align: "center" });
      Y += 22;

      doc.fillColor("rgba(255,255,255,0.6)").font("Helvetica").fontSize(9)
        .text(`Prepared for ${customerName}`, 0, Y, { width: PW, align: "center" });
      Y += 12;
      doc.fillColor("rgba(255,255,255,0.4)").font("Helvetica").fontSize(8)
        .text(customerEmail, 0, Y, { width: PW, align: "center" });
      Y += 22;

      const listX = cx - 170, listW = 340;
      hRule(doc, Y, "rgba(255,255,255,0.15)", false, ML, PW - MR); Y += 14;

      items.forEach((item: any, idx: number) => {
        if (Y + 20 + 160 > PH - 30) { doc.addPage(); paintPage(); Y = 40; }
        const pName = item.product?.name || `Product #${item.product_id}`;
        const qty   = Number(item.quantity) || 1;
        const price = Number(item.price)    || 0;
        const amt   = price * qty;

        doc.fillColor("rgba(255,255,255,0.85)").font("Helvetica").fontSize(9).text(`${pName}  × ${qty}`, listX, Y, { width: listW - 70 });
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(`${currency} ${amt.toFixed(2)}`, listX + listW - 70, Y, { width: 70, align: "right" });
        hRule(doc, Y + 12, "rgba(255,255,255,0.12)", true, listX, listX + listW);
        Y += 20;
      });

      hRule(doc, Y, "rgba(255,255,255,0.15)", false, ML, PW - MR); Y += 14;

      const trow = (label: string, value: string) => {
        doc.fillColor("rgba(255,255,255,0.55)").font("Helvetica").fontSize(8.5).text(label, listX, Y, { width: listW / 2 });
        doc.fillColor("rgba(255,255,255,0.85)").font("Helvetica-Bold").fontSize(8.5).text(value, listX + listW / 2, Y, { width: listW / 2, align: "right" });
        Y += 14;
      };
      trow("Subtotal", `${currency} ${subtotal.toFixed(2)}`);
      trow("Discount", `- ${currency} ${discount.toFixed(2)}`);
      trow(`Tax @ ${taxRate}%`, `${currency} ${taxAmount.toFixed(2)}`);

      Y += 4;
      hRule(doc, Y, t.accent, false, cx - 90, cx + 90); Y += 12;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text("TOTAL DUE", listX, Y, { width: listW / 2, characterSpacing: 1 });
      doc.fillColor(t.accent).font("Helvetica-Bold").fontSize(15).text(`${currency} ${grandTotal.toFixed(2)}`, listX + listW / 2, Y - 2, { width: listW / 2, align: "right" });
      Y += 22;
      hRule(doc, Y, t.accent, false, cx - 90, cx + 90); Y += 18;

      drawStatusPill(doc, cx - 36, Y, statusStr, pillColors.bg, pillColors.fg, 72);
      doc.fillColor("rgba(255,255,255,0.4)").font("Helvetica").fontSize(7.5)
        .text(`${payMethod}  ·  TXN ${txnId}`, 0, Y + 22, { width: PW, align: "center" });
      Y += 46;

      const qrSize = 74;
      strokeRect(doc, cx - qrSize / 2 - 2, Y - 2, qrSize + 4, qrSize + 4, qrSize / 2 + 2, t.accent, 1);
      doc.image(qrBuf, cx - qrSize / 2, Y, { width: qrSize, height: qrSize });
      Y += qrSize + 14;

      doc.fillColor("rgba(255,255,255,0.35)").font("Helvetica-Oblique").fontSize(7.5)
        .text(notes, cx - 170, Y, { width: 340, align: "center", lineGap: 2 });
      Y += 30;

      doc.fillColor("rgba(255,255,255,0.25)").font("Helvetica").fontSize(6.5)
        .text(`Invoice ${invoiceNo}  ·  ${companyName}`, 0, PH - 30, { width: PW, align: "center", characterSpacing: 0.5 });

      break;
    }

    // ════════════════════════════════════════════════════════════════════
    // ECO EMERALD — soft rounded cards: chip meta row, party cards, each
    // line item its own card row, a rounded pill Grand Total.
    // ════════════════════════════════════════════════════════════════════
    case "green": {
      doc.rect(0, 0, PW, PH).fill(t.headerBg);

      let Y = 0;
      roundedRect(doc, 0, 0, PW, 92, 0, t.primary);
      doc.save().roundedRect(0, 92 - 20, PW, 20, 0).fill(t.headerBg).restore();
      // re-draw a clean rounded bottom edge for the hero band
      doc.save();
      doc.rect(0, 0, PW, 80).fill(t.primary);
      doc.restore();

      roundedRect(doc, ML, 22, 40, 40, 20, t.accent);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text("♣", ML, 33, { width: 40, align: "center" });
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14).text(companyName, ML + 52, 28);
      doc.fillColor("rgba(255,255,255,0.7)").font("Helvetica").fontSize(8).text(`${gst}  ·  ${companyEmail}`, ML + 52, 44);

      const pillW = 110;
      roundedRect(doc, PW - MR - pillW, 32, pillW, 24, 12, t.accent);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(title, PW - MR - pillW, 40, { width: pillW, align: "center", characterSpacing: 1 });

      Y = 100;

      // ── CHIP ROW ──
      const chipGap = 8;
      const chipW = (COL_W - chipGap * 3) / 4;
      const chipData: [string, string][] = [
        ["Invoice No.", invoiceNo],
        ["Branch", branch],
        ["Payment", payMethod],
        ["Status", statusStr],
      ];
      chipData.forEach(([label, value], idx) => {
        const cx = ML + idx * (chipW + chipGap);
        roundedRect(doc, cx, Y, chipW, 34, 10, "#ffffff");
        doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(6.5).text(label.toUpperCase(), cx + 8, Y + 6, { characterSpacing: 0.6 });
        if (idx === 3) {
          drawStatusPill(doc, cx + 8, Y + 15, value, pillColors.bg, pillColors.fg, chipW - 16);
        } else {
          doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(8.5).text(value, cx + 8, Y + 17, { width: chipW - 16, height: 10, ellipsis: true });
        }
      });
      Y += 48;

      // ── PARTY CARDS ──
      const cardGap = 12;
      const cardW = (COL_W - cardGap) / 2;
      roundedRect(doc, ML, Y, cardW, 54, 12, "#ffffff");
      doc.fillColor(t.primary).font("Helvetica-Bold").fontSize(7.5).text("FROM", ML + 12, Y + 10, { characterSpacing: 1 });
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9.5).text(companyName, ML + 12, Y + 22, { width: cardW - 24 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(companyAddr, ML + 12, Y + 35, { width: cardW - 24 });

      const cardX2 = ML + cardW + cardGap;
      roundedRect(doc, cardX2, Y, cardW, 54, 12, "#ffffff");
      doc.fillColor(t.primary).font("Helvetica-Bold").fontSize(7.5).text("TO", cardX2 + 12, Y + 10, { characterSpacing: 1 });
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9.5).text(customerName, cardX2 + 12, Y + 22, { width: cardW - 24 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(customerEmail, cardX2 + 12, Y + 35, { width: cardW - 24 });

      Y += 54 + 16;

      // ── ITEM CARDS ──
      items.forEach((item: any, idx: number) => {
        const rowH = 32;
        if (Y + rowH + 170 > PH - 24) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; }

        roundedRect(doc, ML, Y, COL_W, rowH, 10, "#ffffff");
        roundedRect(doc, ML + 10, Y + 6, 20, 20, 10, t.accent);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).text(String(idx + 1), ML + 10, Y + 12, { width: 20, align: "center" });

        const pName   = item.product?.name || `Product #${item.product_id}`;
        const qty     = Number(item.quantity) || 1;
        const price   = Number(item.price)    || 0;
        const itemTax = price * qty * (taxRate / 100);
        const amt     = price * qty;

        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(pName, ML + 40, Y + 6, { width: COL_W - 160, height: 11, ellipsis: true });
        doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5)
          .text(`Qty ${qty} × ${currency}${price.toFixed(2)}  ·  Tax ${itemTax.toFixed(2)}`, ML + 40, Y + 18, { width: COL_W - 160 });
        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9.5).text(`${currency} ${amt.toFixed(2)}`, ML + COL_W - 100, Y + 12, { width: 90, align: "right" });

        Y += rowH + 8;
      });

      Y += 8;

      // ── NOTES CARD + QR ──
      if (Y + 150 > PH - 24) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; }

      const notesW = COL_W - 100;
      roundedRect(doc, ML, Y, notesW, 60, 12, "#ffffff");
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(notes, ML + 14, Y + 14, { width: notesW - 28, lineGap: 2 });

      const qrSize = 60, qrX = ML + notesW + 16;
      roundedRect(doc, qrX, Y, 84, 60, 12, "#ffffff");
      doc.image(qrBuf, qrX + 12, Y + 4, { width: qrSize, height: qrSize - 12 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(6.5).text("Scan to verify", qrX, Y + 50, { width: 84, align: "center" });

      Y += 76;

      // ── TOTALS CARD (rounded pill grand total) ──
      roundedRect(doc, ML, Y, COL_W, 96, 14, "#ffffff");
      const trow = (label: string, value: string, ry: number) => {
        doc.fillColor(t.textLight).font("Helvetica").fontSize(8.5).text(label, ML + 16, ry, { width: COL_W / 2 - 16 });
        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(8.5).text(value, ML + COL_W / 2, ry, { width: COL_W / 2 - 16, align: "right" });
      };
      trow("Subtotal", `${currency} ${subtotal.toFixed(2)}`, Y + 12);
      trow("Discount", `- ${currency} ${discount.toFixed(2)}`, Y + 28);
      trow(`Tax @ ${taxRate}%`, `${currency} ${taxAmount.toFixed(2)}`, Y + 44);

      roundedRect(doc, ML + 12, Y + 62, COL_W - 24, 26, 13, t.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("GRAND TOTAL", ML + 26, Y + 69, { width: COL_W / 2 });
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(`${currency} ${grandTotal.toFixed(2)}`, ML + COL_W / 2, Y + 69, { width: COL_W / 2 - 26, align: "right" });

      Y += 112;

      if (Y + 24 > PH - 8) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; }
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8)
        .text(`${companyName}  ·  Invoice ${invoiceNo}  ·  Printed responsibly`, 0, Y, { width: PW, align: "center" });

      break;
    }

    // ════════════════════════════════════════════════════════════════════
    // SLATE CLASSIC — ultra-minimal ledger: no fills, no rounded corners,
    // only hairline rules and dense typography.
    // ════════════════════════════════════════════════════════════════════
    case "classic": {
      doc.rect(0, 0, PW, PH).fill(t.headerBg);

      let Y = MT;
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(16).text(companyName, ML, Y);
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(`GSTIN ${gst}  ·  ${companyEmail}`, ML, Y + 20);

      const docBoxW = 180;
      doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(8).text(title, PW - MR - docBoxW, Y, { width: docBoxW, align: "right", characterSpacing: 1.5 });
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(13).text(invoiceNo, PW - MR - docBoxW, Y + 12, { width: docBoxW, align: "right" });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(createdAt, PW - MR - docBoxW, Y + 27, { width: docBoxW, align: "right" });

      Y += 44;
      hRule(doc, Y, t.textDark, false, ML, PW - MR);
      Y += 16;

      const halfW = (COL_W - 30) / 2;
      doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(7).text("BILLED FROM", ML, Y, { characterSpacing: 1 });
      doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(7).text("BILLED TO", ML + halfW + 30, Y, { characterSpacing: 1, width: halfW, align: "right" });
      Y += 12;
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9.5).text(companyName, ML, Y, { width: halfW });
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9.5).text(customerName, ML + halfW + 30, Y, { width: halfW, align: "right" });
      Y += 13;
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(companyAddr, ML, Y, { width: halfW });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(customerEmail, ML + halfW + 30, Y, { width: halfW, align: "right" });
      Y += 26;

      hRule(doc, Y, "#e5e7eb", false, ML, PW - MR);
      Y += 10;
      doc.fillColor(t.textLight).font("Helvetica").fontSize(8)
        .text(`Payment: ${payMethod}      TXN: ${txnId}      Status: ${statusStr}`, ML, Y);
      Y += 18;
      hRule(doc, Y, "#e5e7eb", false, ML, PW - MR);
      Y += 12;

      // ── BARE TABLE (hairlines only) ──
      const TBL_NUM = 24, TBL_DESC = 210, TBL_QTY = 40, TBL_UNIT = 78, TBL_TAX = 58, TBL_AMT = 78, SEP = 6;
      const TBL_W = TBL_NUM + SEP + TBL_DESC + SEP + TBL_QTY + SEP + TBL_UNIT + SEP + TBL_TAX + SEP + TBL_AMT;

      const drawMiniHeader = (yy: number) => {
        let tx = ML;
        doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(7.5);
        doc.text("#", tx, yy, { width: TBL_NUM, align: "center" }); tx += TBL_NUM + SEP;
        doc.text("ITEM", tx, yy, { width: TBL_DESC }); tx += TBL_DESC + SEP;
        doc.text("QTY", tx, yy, { width: TBL_QTY, align: "center" }); tx += TBL_QTY + SEP;
        doc.text(`UNIT (${currency})`, tx, yy, { width: TBL_UNIT, align: "right" }); tx += TBL_UNIT + SEP;
        doc.text(`TAX (${taxRate}%)`, tx, yy, { width: TBL_TAX, align: "right" }); tx += TBL_TAX + SEP;
        doc.text(`AMOUNT (${currency})`, tx, yy, { width: TBL_AMT, align: "right" });
        hRule(doc, yy + 12, t.textDark, false, ML, ML + TBL_W);
      };
      drawMiniHeader(Y);
      Y += 20;

      items.forEach((item: any, idx: number) => {
        const rowH = 20;
        if (Y + rowH + 130 > PH - 20) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; drawMiniHeader(Y); Y += 20; }

        const pName   = item.product?.name || `Product #${item.product_id}`;
        const qty     = Number(item.quantity) || 1;
        const price   = Number(item.price)    || 0;
        const itemTax = price * qty * (taxRate / 100);
        const amt     = price * qty;

        let rx = ML;
        doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(String(idx + 1), rx, Y, { width: TBL_NUM, align: "center" }); rx += TBL_NUM + SEP;
        doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(8.5).text(pName, rx, Y, { width: TBL_DESC, height: 10, ellipsis: true }); rx += TBL_DESC + SEP;
        doc.fillColor(t.textDark).font("Helvetica").fontSize(8).text(String(qty), rx, Y, { width: TBL_QTY, align: "center" }); rx += TBL_QTY + SEP;
        doc.text(price.toFixed(2), rx, Y, { width: TBL_UNIT, align: "right" }); rx += TBL_UNIT + SEP;
        doc.fillColor(t.textLight).text(itemTax.toFixed(2), rx, Y, { width: TBL_TAX, align: "right" }); rx += TBL_TAX + SEP;
        doc.fillColor(t.textDark).font("Helvetica-Bold").text(amt.toFixed(2), rx, Y, { width: TBL_AMT, align: "right" });

        hRule(doc, Y + 14, "#e5e7eb", false, ML, ML + TBL_W);
        Y += rowH;
      });

      Y += 14;

      if (Y + 120 > PH - 20) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; }

      const notesW = 250, totalsX = PW - MR - 170, totalsW = 170;
      doc.fillColor(t.textLight).font("Helvetica-Bold").fontSize(7.5).text("NOTES", ML, Y, { characterSpacing: 1 });
      doc.fillColor(t.textMid).font("Helvetica").fontSize(8).text(notes, ML, Y + 12, { width: notesW, lineGap: 2 });
      hRule(doc, Y + 60, "#d1d5db", false, ML, ML + 130);
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7).text("Authorised Signatory", ML, Y + 64);

      const trow = (label: string, value: string, ry: number) => {
        doc.fillColor(t.textLight).font("Helvetica").fontSize(8.5).text(label, totalsX, ry, { width: totalsW / 2 });
        doc.fillColor(t.textDark).font("Helvetica").fontSize(8.5).text(value, totalsX + totalsW / 2, ry, { width: totalsW / 2, align: "right" });
      };
      trow("Subtotal", `${currency} ${subtotal.toFixed(2)}`, Y);
      trow("Discount", `- ${currency} ${discount.toFixed(2)}`, Y + 14);
      trow(`Tax @ ${taxRate}%`, `${currency} ${taxAmount.toFixed(2)}`, Y + 28);
      hRule(doc, Y + 46, t.textDark, false, totalsX, totalsX + totalsW);
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(11).text("GRAND TOTAL", totalsX, Y + 52, { width: totalsW / 2 });
      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(11).text(`${currency} ${grandTotal.toFixed(2)}`, totalsX + totalsW / 2, Y + 52, { width: totalsW / 2, align: "right" });

      Y += 100;

      if (Y + 30 > PH - 8) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(t.headerBg); Y = 36; }
      hRule(doc, Y, "#d1d5db", false, ML, PW - MR);
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5)
        .text(`${companyName}  ·  GSTIN ${gst}  ·  Invoice ${invoiceNo}`, 0, Y + 8, { width: PW, align: "center" });

      break;
    }

    // ════════════════════════════════════════════════════════════════════
    // FALLBACK — the original shared layout, kept for "aurora" (no longer
    // selectable in the UI) and any unrecognised theme id.
    // ════════════════════════════════════════════════════════════════════
    default: {
      // SECTION 1 — HERO HEADER (gradient band + white card)
      doc.rect(0, 0, PW, 120).fill(t.primary);
      doc.rect(0, 0, PW, 5).fill(t.accent);

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(30).text(title, ML, MT + 12, { characterSpacing: 3 });
      doc.fillColor("rgba(255,255,255,0.55)").font("Helvetica").fontSize(8.5)
        .text("BIZCORE ENTERPRISE  ·  OFFICIAL DOCUMENT", ML, MT + 48, { characterSpacing: 1.5 });

      roundedRect(doc, PW - MR - 165, MT + 8, 165, 56, 8, "rgba(255,255,255,0.1)");
      doc.fillColor("rgba(255,255,255,0.6)").font("Helvetica").fontSize(7.5).text("INVOICE NUMBER", PW - MR - 155, MT + 15);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text(invoiceNo, PW - MR - 155, MT + 27);
      doc.fillColor("rgba(255,255,255,0.55)").font("Helvetica").fontSize(7.5).text(`Issued: ${createdAt}    Due: ${dueDateStr}`, PW - MR - 155, MT + 46);

      let Y = 132;
      roundedRect(doc, ML - 4, Y, COL_W + 8, PH - Y - 28, 12, "#ffffff");
      Y += 20;

      // SECTION 2 — PARTIES
      const colW4 = Math.floor((COL_W - 24) / 4);
      const colXs = [ML, ML + colW4 + 8, ML + (colW4 + 8) * 2, ML + (colW4 + 8) * 3];

      roundedRect(doc, ML, Y, COL_W, 18, 4, t.headerBg);
      doc.fillColor(t.primary).font("Helvetica-Bold").fontSize(7)
        .text("ISSUED BY", colXs[0] + 4, Y + 5)
        .text("BRANCH LOCATION", colXs[1] + 4, Y + 5)
        .text("BILL TO", colXs[2] + 4, Y + 5)
        .text("PAYMENT DETAILS", colXs[3] + 4, Y + 5);
      Y += 22;

      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(companyName, colXs[0], Y, { width: colW4 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5)
        .text(`GSTIN: ${gst}`, colXs[0], Y + 13, { width: colW4 })
        .text(`Ph: ${companyPhone}`, colXs[0], Y + 23, { width: colW4 })
        .text(companyAddr, colXs[0], Y + 33, { width: colW4, lineGap: 1 })
        .text(companyEmail, colXs[0], Y + 50, { width: colW4 });

      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(branch, colXs[1], Y, { width: colW4 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5)
        .text("Corporate Distribution", colXs[1], Y + 13, { width: colW4 })
        .text(`Branch ID: BR-${companyId}`, colXs[1], Y + 23, { width: colW4 })
        .text(`Admin: ${companyEmail}`, colXs[1], Y + 33, { width: colW4 });

      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(customerName, colXs[2], Y, { width: colW4 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5)
        .text(`Email: ${customerEmail}`, colXs[2], Y + 13, { width: colW4 })
        .text(`Phone: ${customerPhone}`, colXs[2], Y + 23, { width: colW4 });

      doc.fillColor(t.textDark).font("Helvetica-Bold").fontSize(9).text(payMethod, colXs[3], Y, { width: colW4 });
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(`TXN: ${txnId}`, colXs[3], Y + 13, { width: colW4 });
      drawStatusPill(doc, colXs[3], Y + 26, statusStr, pillColors.bg, pillColors.fg);
      Y += 70;

      hRule(doc, Y, "#e5e7eb");
      Y += 12;

      // SECTION 3 — ITEMS TABLE
      const TBL_NUM  = 26, TBL_DESC = 195, TBL_QTY = 40, TBL_UNIT = 80, TBL_TAX = 60, TBL_AMT = 80, COL_SEP = 6;
      const TBL_TOTAL_W = TBL_NUM + COL_SEP + TBL_DESC + COL_SEP + TBL_QTY + COL_SEP + TBL_UNIT + COL_SEP + TBL_TAX + COL_SEP + TBL_AMT;

      roundedRect(doc, ML, Y, TBL_TOTAL_W, 20, 4, t.primary);
      const TH = { y: Y + 6, size: 7.5 };
      let tx = ML + 4;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(TH.size);
      doc.text("#",          tx, TH.y, { width: TBL_NUM,  align: "center" }); tx += TBL_NUM  + COL_SEP;
      doc.text("DESCRIPTION",tx, TH.y, { width: TBL_DESC, align: "left"   }); tx += TBL_DESC + COL_SEP;
      doc.text("QTY",        tx, TH.y, { width: TBL_QTY,  align: "center" }); tx += TBL_QTY  + COL_SEP;
      doc.text(`UNIT (${currency})`, tx, TH.y, { width: TBL_UNIT, align: "right"  }); tx += TBL_UNIT + COL_SEP;
      doc.text(`TAX (${taxRate}%)`, tx, TH.y, { width: TBL_TAX,  align: "right"  }); tx += TBL_TAX  + COL_SEP;
      doc.text(`AMOUNT (${currency})`, tx, TH.y, { width: TBL_AMT, align: "right" });
      Y += 20;

      items.forEach((item: any, idx: number) => {
        const rowH = 22;
        if (Y + rowH + 120 > PH - 28) {
          doc.addPage();
          Y = 36;
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
        doc.font("Helvetica-Bold").text(pName, rx, Y + 7, { width: TBL_DESC, height: 10, ellipsis: true }); rx += TBL_DESC + COL_SEP;
        doc.font("Helvetica").text(String(qty), rx, Y + 7, { width: TBL_QTY, align: "center" }); rx += TBL_QTY + COL_SEP;
        doc.text(price.toFixed(2), rx, Y + 7, { width: TBL_UNIT, align: "right" }); rx += TBL_UNIT + COL_SEP;
        doc.fillColor(t.textLight).text(itemTax.toFixed(2), rx, Y + 7, { width: TBL_TAX, align: "right" }); rx += TBL_TAX + COL_SEP;
        doc.fillColor(t.textDark).font("Helvetica-Bold").text(amt.toFixed(2), rx, Y + 7, { width: TBL_AMT, align: "right" });

        hRule(doc, Y + rowH, "#e5e7eb");
        Y += rowH;
      });

      Y += 16;

      // SECTION 4 — TOTALS + QR SIDE-BY-SIDE
      if (Y + 170 > PH - 28) { doc.addPage(); Y = 36; }

      const TOTALS_X  = ML + 210, TOTALS_W  = 170;
      const QR_SIZE   = 100, QR_X = TOTALS_X + TOTALS_W + 18, QR_Y = Y;

      doc.image(qrBuf, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
      roundedRect(doc, QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4, 4, "transparent", "#e5e7eb");
      doc.fillColor(t.textLight).font("Helvetica").fontSize(6.5).text("Scan QR to verify", QR_X, QR_Y + QR_SIZE + 5, { width: QR_SIZE, align: "center" });

      roundedRect(doc, TOTALS_X, Y, TOTALS_W, 102, 6, t.headerBg);
      const TR = { lx: TOTALS_X + 10, w: TOTALS_W - 20 };
      function totalsRow(label: string, value: string, ry: number) {
        doc.fillColor(t.textLight).font("Helvetica").fontSize(8).text(label, TR.lx, ry, { width: TR.w / 2 });
        doc.fillColor(t.textDark).font("Helvetica").fontSize(8).text(value, TR.lx + TR.w / 2, ry, { width: TR.w / 2, align: "right" });
      }
      totalsRow("Subtotal:", `${currency} ${subtotal.toFixed(2)}`, Y + 10);
      totalsRow(`Discount:`, `- ${currency} ${discount.toFixed(2)}`, Y + 24);
      totalsRow(`Tax @ ${taxRate}%:`, `${currency} ${taxAmount.toFixed(2)}`, Y + 38);
      hRule(doc, Y + 52, t.accent);

      roundedRect(doc, TOTALS_X, Y + 56, TOTALS_W, 28, 6, t.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("GRAND TOTAL", TOTALS_X + 10, Y + 64, { width: TR.w / 2 });
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(`${currency} ${grandTotal.toFixed(2)}`, TOTALS_X + 10 + TR.w / 2, Y + 64, { width: TR.w / 2, align: "right" });

      doc.fillColor(t.textLight).font("Helvetica").fontSize(7).text(`Amount payable in ${payMethod}`, TOTALS_X, Y + 90, { width: TOTALS_W, align: "center" });

      Y += 118;

      // SECTION 5 — NOTES, SIGNATURE & TERMS
      if (Y + 80 > PH - 28) { doc.addPage(); Y = 36; }

      hRule(doc, Y, t.accent, true);
      Y += 12;

      doc.fillColor(t.primary).font("Helvetica-Bold").fontSize(7.5).text("CUSTOMER NOTE & TERMS", ML, Y);
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7.5).text(notes, ML, Y + 12, { width: 260, lineGap: 2 });

      const SIGN_X = PW - MR - 140;
      hRule(doc, Y + 50, "#d1d5db");
      doc.fillColor(t.textLight).font("Helvetica").fontSize(7).text("AUTHORISED SIGNATORY", SIGN_X, Y + 54, { width: 140, align: "center" });
      doc.fillColor(t.textMid).font("Helvetica-Bold").fontSize(7.5).text(companyName, SIGN_X, Y + 64, { width: 140, align: "center" });

      Y += 80;

      // SECTION 6 — PAGE FOOTER
      const FOOTER_Y = PH - 26;
      doc.rect(0, FOOTER_Y - 8, PW, 34).fill(t.primary);
      doc.rect(0, FOOTER_Y - 8, PW, 3).fill(t.accent);
      doc.fillColor("rgba(255,255,255,0.6)").font("Helvetica").fontSize(7)
        .text(`${companyName}  ·  ${companyEmail}  ·  ${companyPhone}  ·  GSTIN: ${gst}`, 0, FOOTER_Y + 2, { width: PW, align: "center" });
      doc.fillColor("rgba(255,255,255,0.35)").font("Helvetica").fontSize(6.5)
        .text(`Invoice ${invoiceNo}  ·  Generated by BizCore Enterprise  ·  Powered by BizCore`, 0, FOOTER_Y + 13, { width: PW, align: "center" });

      break;
    }
  }

<<<<<<< HEAD
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

=======
>>>>>>> 954333eae4ee92a4f21078518d03f29932ce7105
  // ══════════════════════════════════════════════════════════════════════════
  // FINALISE
  // ══════════════════════════════════════════════════════════════════════════
  doc.end();

  return new Promise<string>((resolve, reject) => {
    ws.on("finish", () => resolve(filePath));
    ws.on("error",  (err) => reject(err));
  });
};
