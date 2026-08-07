import * as Sharing from "expo-sharing";
import Share, { Social } from "react-native-share";
import { normalizeIndianPhone } from "../utils/phone";

/** Open WhatsApp to the patient with the A4 prescription PDF attached (no prefilled text). */
export async function sharePrescriptionWhatsApp(
  phone: string,
  pdfUri: string,
  filename = "Prescription.pdf"
): Promise<boolean> {
  const waPhone = normalizeIndianPhone(phone);
  if (!waPhone) return false;

  const fileUrl = pdfUri.startsWith("file://") ? pdfUri : `file://${pdfUri}`;

  try {
    await Share.shareSingle({
      social: Social.Whatsapp,
      url: fileUrl,
      whatsAppNumber: waPhone,
      type: "application/pdf",
      filename,
    } as Parameters<typeof Share.shareSingle>[0]);
    return true;
  } catch {
    // WhatsApp unavailable or user dismissed - offer PDF via system share sheet.
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Send prescription",
        UTI: "com.adobe.pdf",
      });
      return true;
    }
    return false;
  }
}
