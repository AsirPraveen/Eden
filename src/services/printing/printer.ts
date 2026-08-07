import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { PermissionsAndroid, Platform } from "react-native";
import Constants from "expo-constants";
import * as Sharing from "expo-sharing";
import { Clinic, Member, Patient, Visit } from "../../types/models";
import { defaultBranding } from "../../theme/branding";
import { prescriptionPdfFilename } from "../../utils/pdfFilename";
import { buildVisitA4Html, buildVisitReceipt, buildVisitThermalHtml } from "./receipt";
import { resolvePrintBranding } from "./logo";

const APP_NAME = Constants.expoConfig?.name ?? defaultBranding.appName;

export type BtDevice = { name: string; address: string };

export type GeneratedPdf = { uri: string; filename: string };

function getBt(): any | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-classic");
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

export function isBluetoothAvailable(): boolean {
  return getBt() != null;
}

async function ensureBtPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;
  const wanted = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  ].filter(Boolean);
  if (wanted.length === 0) return;
  const result = await PermissionsAndroid.requestMultiple(wanted);
  const denied = Object.values(result).some((v) => v !== PermissionsAndroid.RESULTS.GRANTED);
  if (denied) throw new Error("Bluetooth permission was denied. Allow it in Settings to print.");
}

export async function listPairedPrinters(): Promise<BtDevice[]> {
  const bt = getBt();
  if (!bt) throw new Error(`Bluetooth printing needs the ${APP_NAME} dev build (not Expo Go).`);
  await ensureBtPermissions();
  const enabled = await bt.isBluetoothEnabled();
  if (!enabled) {
    const ok = await bt.requestBluetoothEnabled().catch(() => false);
    if (!ok) throw new Error("Turn on Bluetooth to find printers.");
  }
  const devices = await bt.getBondedDevices();
  return devices.map((d: any) => ({ name: d.name ?? "Unknown", address: d.address }));
}

export async function printBase64(address: string, base64: string): Promise<void> {
  const bt = getBt();
  if (!bt) throw new Error(`Bluetooth printing needs the ${APP_NAME} dev build (not Expo Go).`);
  await ensureBtPermissions();
  let device = await bt.getConnectedDevice(address).catch(() => null);
  if (!device) {
    device = await bt.connectToDevice(address, { connectionType: "binary" });
  }
  await device.write(base64, "base64");
  await new Promise((r) => setTimeout(r, 400));
}

export async function printVisitThermal(visit: Visit, clinic: Clinic): Promise<void> {
  if (!clinic.printerConfig?.address) {
    throw new Error("No printer set up for this clinic. Add one in More → Printer.");
  }
  const payload = buildVisitReceipt(visit, clinic);
  await printBase64(clinic.printerConfig.address, payload);
}

async function printHtmlToPdf(html: string, filename: string): Promise<GeneratedPdf> {
  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  const destInfo = await FileSystem.getInfoAsync(dest);
  if (destInfo.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  if (tempUri !== dest) {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
  }
  return { uri: dest, filename };
}

export type PrintContext = { accountId?: string | null; member?: Member | null };

/** Generate A4 prescription PDF with an identifiable filename. */
export async function generateVisitPdfA4(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  ctx?: PrintContext
): Promise<GeneratedPdf> {
  const print = await resolvePrintBranding(clinic, ctx?.accountId, ctx?.member);
  const filename = prescriptionPdfFilename(visit.patientName, visit.date.toDate(), "prescription");
  return printHtmlToPdf(buildVisitA4Html(visit, clinic, patient, print), filename);
}

/** Generate 70 mm thermal receipt PDF with an identifiable filename. */
export async function generateVisitPdfThermal(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  ctx?: PrintContext
): Promise<GeneratedPdf> {
  const print = await resolvePrintBranding(clinic, ctx?.accountId, ctx?.member);
  const filename = prescriptionPdfFilename(visit.patientName, visit.date.toDate(), "receipt");
  return printHtmlToPdf(buildVisitThermalHtml(visit, clinic, patient, print), filename);
}

async function sharePdf(uri: string, filename: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
  } else {
    await Print.printAsync({ uri });
  }
}

export async function shareVisitPdfA4(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  ctx?: PrintContext
): Promise<GeneratedPdf> {
  const pdf = await generateVisitPdfA4(visit, clinic, patient, ctx);
  await sharePdf(pdf.uri, pdf.filename, "A4 Prescription");
  return pdf;
}

export async function shareVisitPdfThermal(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  ctx?: PrintContext
): Promise<GeneratedPdf> {
  const pdf = await generateVisitPdfThermal(visit, clinic, patient, ctx);
  await sharePdf(pdf.uri, pdf.filename, "Thermal Receipt (70mm)");
  return pdf;
}

/** @deprecated Use shareVisitPdfA4 or shareVisitPdfThermal */
export async function shareVisitPdf(visit: Visit, clinic: Clinic): Promise<void> {
  await shareVisitPdfThermal(visit, clinic);
}

export async function printTest(address: string, paperWidth: 58 | 80, clinicName?: string): Promise<void> {
  const { EscPos } = await import("./escpos");
  const p = new EscPos(paperWidth);
  p.align("center").size(true).bold(true).line(clinicName ?? APP_NAME).size(false).bold(false);
  p.line("Printer test OK").rule().feed(3).cut();
  await printBase64(address, p.toBase64());
}
