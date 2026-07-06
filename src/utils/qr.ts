import QRCode from "qrcode";

/** Returns a base64 data-URL (for Angular frontend preview) */
export const generateQR = async (data: string): Promise<string> => {
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  });
};

/** Returns a raw PNG Buffer (for PDFKit image embedding) */
export const generateQRBuffer = async (data: string): Promise<Buffer> => {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 300,
    color: { dark: "#000000", light: "#ffffff" },
  });
};