// ─── App Constants ────────────────────────────────────────────

export const APP_NAME = 'Eden';

export const MEDICINE_CATEGORIES = [
  'Tablets',
  'Capsules',
  'Syrups',
  'Injections',
  'Ointments',
  'Drops',
  'Surgical',
  'Others',
] as const;

export const DOSAGE_OPTIONS = [
  '1-0-0',
  '0-1-0',
  '0-0-1',
  '1-1-0',
  '1-0-1',
  '0-1-1',
  '1-1-1',
  '1-1-1-1',
  'SOS',
  'As Directed',
] as const;

export const DOSAGE_TIMINGS = [
  'Before Food',
  'After Food',
  'With Food',
  'Empty Stomach',
  'As Directed',
] as const;

export const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Other',
] as const;

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-',
] as const;

// Payment urgency thresholds (in days)
export const PAYMENT_URGENCY = {
  SAFE: 20,        // > 20 days: green
  WARNING: 7,      // 7-20 days: yellow/amber
  CRITICAL: 3,     // 3-7 days: orange
  URGENT: 0,       // 0-3 days: red
  OVERDUE: -1,     // negative: dark red
} as const;

// Notification schedule (days before due)
export const PAYMENT_NOTIFICATION_DAYS = [7, 3, 1, 0, -1, -3, -7] as const;

// Default settings
export const DEFAULT_PAYMENT_TERM_DAYS = 50;
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_EXPIRY_ALERT_DAYS = 30;
