const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Safe filename segment from a patient or clinic name. */
export function sanitizeFilenamePart(name: string, maxLen = 40): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return (cleaned || "Patient").slice(0, maxLen);
}

function formatFilenameDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}${MONTHS[d.getMonth()]}${d.getFullYear()}`;
}

export type PrescriptionPdfKind = "prescription" | "receipt";

/** e.g. Joel_Prescription_01Aug2026.pdf */
export function prescriptionPdfFilename(
  patientName: string,
  date: Date,
  kind: PrescriptionPdfKind = "prescription"
): string {
  const label = kind === "receipt" ? "Receipt" : "Prescription";
  return `${sanitizeFilenamePart(patientName)}_${label}_${formatFilenameDate(date)}.pdf`;
}
