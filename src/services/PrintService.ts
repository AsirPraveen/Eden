import * as Print from 'expo-print';
import { formatCurrency } from '../utils/helpers';
import type { Clinic } from '../types';

/**
 * Print a prescription receipt for thermal printers (58mm / 80mm).
 * Uses expo-print which opens the system print dialog.
 * For direct Bluetooth printing, a future integration with
 * react-native-thermal-receipt-printer-image-qr is planned.
 */
export const printPrescription = async (
  prescription: any,
  clinic: Clinic
): Promise<void> => {
  const items = prescription.items || [];

  const svgPaths = prescription.signatureData
    ? prescription.signatureData.split('|||').filter(Boolean).map((p: string) => `<path d="${p}" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`).join('')
    : '';

  const signatureHtml = svgPaths
    ? `
      <div style="text-align:right;margin-top:6px;margin-bottom:2px;">
        <svg width="120" height="45" viewBox="0 0 320 180" style="display:inline-block;">
          <g>${svgPaths}</g>
        </svg>
      </div>
    `
    : '';

  const medicineRows = items
    .map(
      (item: any, idx: number) => `
        <tr>
          <td style="padding:4px 2px;border-bottom:1px dashed #ddd;font-size:11px;">${idx + 1}</td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ddd;">
            <strong style="font-size:12px;">${item.medicineName}</strong><br/>
            <span style="font-size:10px;color:#666;">${item.dosage} — ${item.timing} — ${item.duration} days</span>
            ${item.instructions ? `<br/><span style="font-size:10px;color:#888;font-style:italic;">${item.instructions}</span>` : ''}
          </td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ddd;text-align:center;font-size:11px;">${item.quantity}</td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ddd;text-align:right;font-size:11px;">${formatCurrency(item.amount || 0)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        @page {
          margin: 4mm;
          size: 80mm auto;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          color: #000;
          padding: 2mm;
          max-width: 76mm;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .clinic-name {
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }
        .clinic-addr {
          font-size: 10px;
          color: #555;
          margin: 2px 0;
        }
        .clinic-phone {
          font-size: 10px;
          color: #555;
        }
        .patient-info {
          margin-bottom: 8px;
          font-size: 11px;
        }
        .patient-info td {
          padding: 1px 0;
        }
        .patient-label {
          font-weight: bold;
          width: 60px;
          font-size: 10px;
          color: #555;
        }
        table.medicines {
          width: 100%;
          border-collapse: collapse;
        }
        table.medicines th {
          border-bottom: 1px solid #000;
          padding: 3px 2px;
          font-size: 10px;
          text-align: left;
          text-transform: uppercase;
        }
        .total-row {
          border-top: 2px solid #000;
          margin-top: 6px;
          padding-top: 6px;
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
        }
        .notes {
          margin-top: 8px;
          padding: 4px;
          border: 1px dashed #ccc;
          font-size: 10px;
          color: #555;
        }
        .footer {
          text-align: center;
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px dashed #aaa;
          font-size: 10px;
          color: #888;
        }
        .doctor-sig {
          margin-top: 16px;
          text-align: right;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <p class="clinic-name">${clinic.name || 'Clinic'}</p>
        ${clinic.address ? `<p class="clinic-addr">${clinic.address}</p>` : ''}
        ${clinic.phone ? `<p class="clinic-phone">Ph: ${clinic.phone}</p>` : ''}
        ${clinic.doctorRegNo ? `<p class="clinic-phone">Reg: ${clinic.doctorRegNo}</p>` : ''}
      </div>

      <table class="patient-info" width="100%">
        <tr>
          <td class="patient-label">Patient:</td>
          <td><strong>${prescription.patientName}</strong></td>
          <td class="patient-label" style="text-align:right;">Date:</td>
          <td style="text-align:right;">${new Date().toLocaleDateString('en-IN')}</td>
        </tr>
        <tr>
          <td class="patient-label">Phone:</td>
          <td>${prescription.patientPhone || '-'}</td>
          <td class="patient-label" style="text-align:right;">Age:</td>
          <td style="text-align:right;">${prescription.patientAge || '-'}${prescription.patientGender ? '/' + prescription.patientGender.charAt(0) : ''}</td>
        </tr>
        ${prescription.diagnosis ? `
        <tr>
          <td class="patient-label">Dx:</td>
          <td colspan="3">${prescription.diagnosis}</td>
        </tr>
        ` : ''}
      </table>

      <table class="medicines" width="100%">
        <thead>
          <tr>
            <th style="width:14px;">#</th>
            <th>Medicine</th>
            <th style="text-align:center;width:30px;">Qty</th>
            <th style="text-align:right;width:50px;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${medicineRows}
        </tbody>
      </table>

      <div class="total-row">
        <span>Total:</span>
        <span>${formatCurrency(prescription.totalAmount || 0)}</span>
      </div>

      ${prescription.notes ? `<div class="notes"><strong>Notes:</strong> ${prescription.notes}</div>` : ''}

      <div class="doctor-sig">
        ${signatureHtml}
        Dr. ${prescription.doctorName || ''}
      </div>

      <div class="footer">
        ${clinic.settings?.prescriptionFooter || 'Get well soon!'}<br/>
        Powered by Eden
      </div>
    </body>
    </html>
  `;

  await Print.printAsync({ html });
};

/**
 * Generate prescription as shareable PDF (for WhatsApp, email, etc.)
 */
export const generatePrescriptionPdf = async (
  prescription: any,
  clinic: Clinic
): Promise<string> => {
  // Uses the same HTML template but generates a file URI
  const html = buildPrescriptionHtml(prescription, clinic);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};

const buildPrescriptionHtml = (prescription: any, clinic: Clinic): string => {
  const items = prescription.items || [];
  const rows = items
    .map((item: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.medicineName}<br/><small>${item.dosage} - ${item.timing}</small></td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.amount || 0)}</td>
      </tr>
    `)
    .join('');

  const svgPaths = prescription.signatureData
    ? prescription.signatureData.split('|||').filter(Boolean).map((p: string) => `<path d="${p}" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`).join('')
    : '';

  const signatureHtml = svgPaths
    ? `
      <div style="text-align:right;margin-top:6px;margin-bottom:2px;">
        <svg width="120" height="45" viewBox="0 0 320 180" style="display:inline-block;">
          <g>${svgPaths}</g>
        </svg>
      </div>
    `
    : '';

  return `
    <html><body style="font-family:sans-serif;padding:16px;font-size:12px;">
      <h2 style="text-align:center;margin:0;">${clinic.name}</h2>
      <p style="text-align:center;margin:4px 0;font-size:11px;">${clinic.address || ''}</p>
      <hr/>
      <p><strong>Patient:</strong> ${prescription.patientName} | <strong>Age:</strong> ${prescription.patientAge || '-'}</p>
      ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ''}
      <table width="100%" cellpadding="4" style="border-collapse:collapse;">
        <tr style="border-bottom:2px solid #000;">
          <th>#</th><th>Medicine</th><th>Qty</th><th>Amount</th>
        </tr>
        ${rows}
      </table>
      <p style="text-align:right;font-size:16px;font-weight:bold;">Total: ${formatCurrency(prescription.totalAmount || 0)}</p>
      ${signatureHtml}
      <p style="text-align:right;">Dr. ${prescription.doctorName || ''}</p>
      <p style="text-align:center;color:#888;font-size:10px;">${clinic.settings?.prescriptionFooter || 'Get well soon!'}</p>
    </body></html>
  `;
};
