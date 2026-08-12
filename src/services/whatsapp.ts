import { Dimensions, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import Share, { Social } from "react-native-share";
import { normalizeIndianPhone } from "../utils/phone";

/** Detect tablet-sized screens where shareSingle may fail. */
function isTablet(): boolean {
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) >= 600;
}

/** Small delay to let the PDF fully flush to disk before sharing. */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Open WhatsApp to the patient with the A4 prescription PDF attached (no prefilled text). */
export async function sharePrescriptionWhatsApp(
  phone: string,
  pdfUri: string,
  filename = "Prescription.pdf"
): Promise<boolean> {
  const waPhone = normalizeIndianPhone(phone);
  if (!waPhone) return false;

  const fileUrl = pdfUri.startsWith("file://") ? pdfUri : `file://${pdfUri}`;

  // Small delay to ensure PDF is fully written
  await delay(300);

  try {
    // On tablets, shareSingle often fails silently (opens WhatsApp but no attachment).
    // Use system share sheet as fallback on tablets for reliability.
    if (isTablet() && Platform.OS === "android") {
      // Try opening WhatsApp to the correct contact first
      const waUrl = `whatsapp://send?phone=${waPhone}`;
      const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);
      if (canOpen) {
        // Use system share sheet which works reliably on tablets
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: "application/pdf",
            dialogTitle: `Send prescription to ${waPhone}`,
            UTI: "com.adobe.pdf",
          });
          return true;
        }
      }
    }

    // Phone path: shareSingle works well on mobile-sized screens
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
