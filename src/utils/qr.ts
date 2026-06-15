import QRCode from "qrcode";

export const generateQR = async (data: string) => {
  return await QRCode.toDataURL(data);
};