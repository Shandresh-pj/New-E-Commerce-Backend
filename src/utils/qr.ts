import QRCode from "qrcode";

/** Returns a base64 data-URL (for Angular frontend preview) */
export const generateQR = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    });
  } catch (err) {
    console.error("[QR Utility] generateQR error:", err);
    return "";
  }
};

/** Returns a raw PNG Buffer (for PDFKit image embedding) */
export const generateQRBuffer = async (data: string): Promise<Buffer> => {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 300,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    });
  } catch (err) {
    console.error("[QR Utility] generateQRBuffer error:", err);
    // Create a 100x100 white fallback image buffer if QR fails
    return await QRCode.toBuffer(data || "INVOICE-QR-VERIFICATION", {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 200,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }
};