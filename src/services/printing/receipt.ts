import { resolveBranding } from "../../theme/branding";
import { Clinic, Patient, Visit } from "../../types/models";
import { formatDoctorDisplay } from "../../utils/doctor";
import { formatDate, formatDateTime, formatMoney } from "../../utils/format";
import { EscPos } from "./escpos";
import { PrintBranding } from "./logo";

export type PrescriptionPatient = {
  name: string;
  age?: number | null;
  sex?: string | null;
  phone?: string;
};

function patientFromVisit(visit: Visit, patient?: Patient | null): PrescriptionPatient {
  if (patient) {
    return {
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      phone: patient.phone,
    };
  }
  return { name: visit.patientName };
}

function doseLine(it: Visit["items"][number]): string {
  return [it.dosage, it.timing, it.days ? `${it.days} days` : ""].filter(Boolean).join(" · ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function patientMeta(p: PrescriptionPatient, includePhone = true): string {
  const parts = [
    p.age != null ? `${p.age} yrs` : "",
    p.sex ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : "",
    includePhone && p.phone ? `Ph: ${p.phone}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function logoCorner(dataUri: string | null, className: string): string {
  if (!dataUri) return "";
  return `<img class="${className}" src="${dataUri}" alt="" />`;
}

/** Build the ESC/POS prescription/bill receipt for a visit (Bluetooth thermal). */
export function buildVisitReceipt(visit: Visit, clinic: Clinic): string {
  const width = clinic.printerConfig?.paperWidth ?? 58;
  const p = new EscPos(width);

  p.align("center").size(true).bold(true).line(clinic.name).size(false).bold(false);
  if (clinic.doctorName) p.line(formatDoctorDisplay(clinic.doctorName));
  if (clinic.regNo) p.line(`Reg. No. ${clinic.regNo}`);
  if (clinic.address) p.wrapped(clinic.address);
  if (clinic.phone) p.line(`Ph: ${clinic.phone}`);
  p.rule("=");

  p.align("left");
  p.row(visit.patientName, formatDateTime(visit.date.toDate()).replace(",", ""));
  if (visit.diagnosis) p.wrapped(`Dx: ${visit.diagnosis}`);
  p.rule();
  p.bold(true).line("Rx").bold(false);

  visit.items.forEach((it, i) => {
    p.bold(true).wrapped(`${i + 1}. ${it.medicineName}`).bold(false);
    const dose = doseLine(it);
    if (dose) p.line(`   ${dose}`);
    p.row(`   ${it.qty} x Rs.${it.price}`, `Rs.${(it.qty * it.price).toFixed(2)}`);
  });

  p.rule();
  if (visit.consultationFee > 0) {
    p.row("Medicines", `Rs.${visit.medicinesAmount.toFixed(2)}`);
    p.row("Consultation", `Rs.${visit.consultationFee.toFixed(2)}`);
  }
  p.bold(true).row("TOTAL", `Rs.${visit.totalAmount.toFixed(2)}`).bold(false);
  if (visit.paymentMode !== "unpaid") p.row("Paid by", visit.paymentMode.toUpperCase());
  p.rule("=");
  p.align("center").line("Get well soon").line("");
  p.feed(3).cut();

  return p.toBase64();
}

/** A4 prescription PDF - clinic logo in top-right corner. */
export function buildVisitA4Html(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  print?: PrintBranding
): string {
  const p = patientFromVisit(visit, patient);
  const meta = patientMeta(p);
  const b = resolveBranding(clinic);
  const theme = print ?? {
    logoDataUri: null,
    signatureDataUri: null,
    doctorDisplayName: clinic.doctorName ? formatDoctorDisplay(clinic.doctorName) : null,
    primary: b.primary,
    accent: b.accent,
    displayName: b.displayName,
  };

  const medicineRows = visit.items
    .map(
      (it, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          <div class="med-name">${escapeHtml(it.medicineName)}</div>
          ${doseLine(it) ? `<div class="dose">${escapeHtml(doseLine(it))}</div>` : ""}
        </td>
        <td class="center">${it.qty}</td>
        <td class="right">${formatMoney(it.price)}</td>
        <td class="right">${formatMoney(it.qty * it.price)}</td>
      </tr>`
    )
    .join("");

  const footerDate = formatDateTime(visit.date.toDate());
  const primary = theme.primary;
  const accent = theme.accent;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: ${primary}; font-size: 11pt; line-height: 1.45; margin: 0; position: relative; }
  .logo-corner { position: absolute; top: 0; right: 0; max-height: 56px; max-width: 120px; object-fit: contain; }
  .header { border-bottom: 2px solid ${accent}; padding-bottom: 10px; padding-right: 130px; margin-bottom: 14px; }
  .clinic-name { font-size: 20pt; font-weight: 700; color: ${primary}; margin: 0; }
  .clinic-sub { font-size: 10pt; color: #444; margin: 2px 0; }
  .doctor { font-size: 12pt; font-weight: 600; margin-top: 8px; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: ${accent}; margin-bottom: 4px; }
  .patient-box { display: flex; justify-content: space-between; gap: 16px; border: 1px solid #d8dde6; border-radius: 6px; padding: 10px 12px; background: #f8f9fb; }
  .patient-name { font-size: 13pt; font-weight: 700; }
  .rx-symbol { font-size: 22pt; font-weight: 700; color: ${primary}; margin: 10px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { text-align: left; border-bottom: 2px solid ${primary}; padding: 6px 4px; font-size: 9pt; text-transform: uppercase; }
  td { padding: 8px 4px; border-bottom: 1px solid #e2e5ea; vertical-align: top; }
  .num { width: 28px; color: #666; }
  .center { text-align: center; }
  .right { text-align: right; white-space: nowrap; }
  .med-name { font-weight: 600; }
  .dose { font-size: 9pt; color: #555; margin-top: 2px; }
  .totals { margin-top: 12px; width: 240px; margin-left: auto; font-size: 10pt; }
  .totals tr td { border: none; padding: 3px 0; }
  .totals .grand td { font-weight: 700; font-size: 12pt; border-top: 2px solid ${primary}; padding-top: 6px; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #d8dde6; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-line { width: 180px; border-top: 1px solid #333; padding-top: 4px; font-size: 9pt; text-align: center; }
  .sig-img-wrap { width: 180px; text-align: center; }
  .sig-img { max-width: 180px; max-height: 56px; object-fit: contain; }
  .footer-note { font-size: 8pt; color: #777; max-width: 55%; }
</style></head><body>
  ${logoCorner(theme.logoDataUri, "logo-corner")}
  <div class="header">
    <h1 class="clinic-name">${escapeHtml(clinic.name)}</h1>
    ${clinic.address ? `<div class="clinic-sub">${escapeHtml(clinic.address)}</div>` : ""}
    ${clinic.phone ? `<div class="clinic-sub">Phone: ${escapeHtml(clinic.phone)}</div>` : ""}
    ${theme.doctorDisplayName ? `<div class="doctor">${escapeHtml(theme.doctorDisplayName)}${clinic.regNo ? ` · Reg. ${escapeHtml(clinic.regNo)}` : ""}</div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Patient</div>
    <div class="patient-box">
      <div>
        <div class="patient-name">${escapeHtml(p.name)}</div>
        ${meta ? `<div class="clinic-sub">${escapeHtml(meta)}</div>` : ""}
      </div>
      <div class="clinic-sub" style="text-align:right">${escapeHtml(formatDate(visit.date.toDate()))}</div>
    </div>
  </div>

  ${visit.diagnosis ? `<div class="section"><div class="section-title">Diagnosis</div><div>${escapeHtml(visit.diagnosis)}</div></div>` : ""}

  <div class="rx-symbol">℞</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th class="center">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${medicineRows}</tbody>
  </table>

  <table class="totals">
    ${visit.consultationFee > 0 ? `<tr><td>Medicines</td><td class="right">${formatMoney(visit.medicinesAmount)}</td></tr><tr><td>Consultation</td><td class="right">${formatMoney(visit.consultationFee)}</td></tr>` : ""}
    <tr class="grand"><td>Total (${visit.paymentMode.toUpperCase()})</td><td class="right">${formatMoney(visit.totalAmount)}</td></tr>
  </table>

  <div class="footer">
    <div class="footer-note">
      This is a computer-generated prescription from ${escapeHtml(theme.displayName)}.<br/>
      Generated on ${escapeHtml(footerDate)}.
    </div>
    ${theme.signatureDataUri
      ? `<div class="sig-img-wrap">
          <img class="sig-img" src="${theme.signatureDataUri}" alt="" />
          <div class="sig-line" style="margin-top: 4px;">Doctor's signature</div>
        </div>`
      : ""}
  </div>
</body></html>`;
}

/** 70 mm thermal receipt PDF - logo in top-right corner. */
export function buildVisitThermalHtml(
  visit: Visit,
  clinic: Clinic,
  patient?: Patient | null,
  print?: PrintBranding
): string {
  const p = patientFromVisit(visit, patient);
  const meta = patientMeta(p, false);
  const b = resolveBranding(clinic);
  const theme = print ?? {
    logoDataUri: null,
    signatureDataUri: null,
    doctorDisplayName: clinic.doctorName ? formatDoctorDisplay(clinic.doctorName) : null,
    primary: b.primary,
    accent: b.accent,
    displayName: b.displayName,
  };

  const rows = visit.items
    .map(
      (it, i) => `
      <tr><td colspan="2" class="med">${i + 1}. ${escapeHtml(it.medicineName)}</td></tr>
      ${doseLine(it) ? `<tr><td colspan="2" class="dose">${escapeHtml(doseLine(it))}</td></tr>` : ""}
      <tr><td class="qty">${it.qty} × ${formatMoney(it.price)}</td><td class="amt">${formatMoney(it.qty * it.price)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: 70mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", Courier, monospace; width: 66mm; margin: 0 auto; color: #111; font-size: 9px; line-height: 1.35; position: relative; }
  .logo-corner { position: absolute; top: 0; right: 0; max-height: 32px; max-width: 56px; object-fit: contain; }
  .head { padding-right: 58px; }
  h1 { font-size: 11px; margin: 2px 0; font-weight: 700; }
  .center { text-align: center; margin: 1px 0; }
  .meta { font-size: 8px; color: #333; }
  hr { border: none; border-top: 1px dashed #333; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .med { font-weight: 700; padding-top: 3px; }
  .dose { font-size: 8px; color: #444; padding-bottom: 1px; }
  .amt, .total-amt { text-align: right; white-space: nowrap; }
  .total td { font-weight: 700; border-top: 1px solid #333; padding-top: 3px; }
  .footer { text-align: center; font-size: 8px; margin-top: 6px; }
</style></head><body>
  ${logoCorner(theme.logoDataUri, "logo-corner")}
  <div class="head">
    <h1>${escapeHtml(clinic.name)}</h1>
    ${theme.doctorDisplayName ? `<div class="meta">${escapeHtml(theme.doctorDisplayName)}</div>` : ""}
    ${clinic.regNo ? `<div class="meta">Reg. ${escapeHtml(clinic.regNo)}</div>` : ""}
    ${clinic.address ? `<div class="meta">${escapeHtml(clinic.address)}</div>` : ""}
    ${clinic.phone ? `<div class="meta">Ph: ${escapeHtml(clinic.phone)}</div>` : ""}
  </div>
  <hr/>
  <table>
    <tr><td><b>${escapeHtml(p.name)}</b></td><td class="amt meta">${escapeHtml(formatDate(visit.date.toDate()))}</td></tr>
    ${meta ? `<tr><td colspan="2" class="meta">${escapeHtml(meta)}</td></tr>` : ""}
  </table>
  ${visit.diagnosis ? `<div class="meta">Dx: ${escapeHtml(visit.diagnosis)}</div>` : ""}
  <hr/>
  <div style="font-weight:700">℞</div>
  <table>${rows}
    ${visit.consultationFee > 0 ? `<tr><td>Medicines</td><td class="amt">${formatMoney(visit.medicinesAmount)}</td></tr><tr><td>Consultation</td><td class="amt">${formatMoney(visit.consultationFee)}</td></tr>` : ""}
    <tr class="total"><td>TOTAL</td><td class="total-amt">${formatMoney(visit.totalAmount)}</td></tr>
  </table>
  <hr/>
  <div class="footer">Get well soon · ${escapeHtml(theme.displayName)}</div>
</body></html>`;
}

/** @deprecated Use buildVisitThermalHtml - kept for compatibility. */
export function buildVisitHtml(visit: Visit, clinic: Clinic): string {
  return buildVisitThermalHtml(visit, clinic);
}
