/** Normalize to WhatsApp-ready digits: 91XXXXXXXXXX (India). Returns null if invalid. */
export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^91[6-9]/.test(digits)) return digits;
  return null;
}

export function isValidIndianPhone(phone: string): boolean {
  return normalizeIndianPhone(phone) !== null;
}

/** Store as 10-digit local number when valid; otherwise returns trimmed input. */
export function storageIndianPhone(phone: string): string {
  const norm = normalizeIndianPhone(phone);
  if (!norm) return phone.trim();
  return norm.slice(-10);
}

const INVALID_MSG = "Enter a valid 10-digit Indian mobile (starts with 6–9).";

/** Required Indian mobile - returns error message or null if valid. */
export function indianPhoneError(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Enter a phone number.";
  if (!isValidIndianPhone(trimmed)) return INVALID_MSG;
  return null;
}

/** Optional phone - validates only when non-empty. */
export function indianPhoneErrorOptional(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (!isValidIndianPhone(trimmed)) return INVALID_MSG;
  return null;
}
