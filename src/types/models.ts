import { Timestamp } from "firebase/firestore";

export type Role = "owner" | "doctor" | "staff";

/** Doctor-controlled capabilities for staff members. */
export type StaffPermissions = {
  purchase: boolean;
  addMedicine: boolean;
  reports: boolean;
  inventory: boolean;
  sales: boolean;
  expenses: boolean;
  patientManagement: boolean;
  supplierManagement: boolean;
};

export type Account = {
  id: string;
  name: string;
  ownerUid: string;
  plan: "free";
  staffPermissions?: StaffPermissions;
  createdAt: Timestamp;
};

export type Member = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  clinicIds: string[]; // empty = all clinics
  active: boolean;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  createdAt: Timestamp;
};

export type PrinterConfig = {
  name: string;
  address: string; // Bluetooth MAC
  paperWidth: 58 | 80;
} | null;

export type Clinic = {
  id: string;
  name: string;
  address: string;
  phone: string;
  doctorName: string;
  regNo: string; // medical registration no, printed on Rx
  logoUrl: string | null; // Cloudinary URL - shown in app and on printed documents
  primaryColor: string | null; // clinic theme primary (hex)
  accentColor: string | null; // clinic theme accent / CTA (hex)
  printerConfig: PrinterConfig;
  active: boolean;
  createdAt: Timestamp;
};

export type Supplier = {
  id: string;
  clinicId: string;
  repName: string;
  company: string;
  phone: string;
  notes: string;
  active: boolean;
  createdAt: Timestamp;
};

export type MedicineForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "injection"
  | "drops"
  | "ointment"
  | "powder"
  | "other";

export type Medicine = {
  id: string;
  clinicId: string;
  name: string;
  genericName: string;
  form: MedicineForm;
  unit: string; // "tab", "ml", "vial"...
  defaultPrice: number; // selling price per unit
  lowStockThreshold: number;
  active: boolean;
  createdAt: Timestamp;
};

export type Batch = {
  batchNo: string;
  expiry: string; // "YYYY-MM"
  qty: number;
  costPrice: number; // per unit
};

export type StockDoc = {
  id: string; // `${clinicId}_${medicineId}`
  clinicId: string;
  medicineId: string;
  qty: number;
  batches: Batch[];
  updatedAt: Timestamp;
};

export type PurchaseItem = {
  medicineId: string;
  medicineName: string;
  batchNo: string;
  expiry: string;
  qty: number;
  costPrice: number;
  freeQty: number; // rep schemes: e.g. 10 + 2 free
};

export type Payment = {
  amount: number;
  date: Timestamp;
  mode: "cash" | "upi" | "bank" | "other";
  note: string;
  byUid: string;
};

export type PurchaseStatus = "unpaid" | "partial" | "paid";

export type Purchase = {
  id: string;
  clinicId: string;
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  items: PurchaseItem[];
  totalAmount: number;
  creditDays: number;
  date: Timestamp;
  dueDate: Timestamp;
  paidAmount: number;
  payments: Payment[];
  status: PurchaseStatus;
  createdBy: string;
  createdAt: Timestamp;
};

export type Patient = {
  id: string;
  name: string;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  phone: string;
  address: string;
  notes: string;
  createdAt: Timestamp;
  lastVisitAt: Timestamp | null;
};

export type VisitItem = {
  medicineId: string;
  medicineName: string;
  qty: number;
  dosage: string; // "1-0-1"
  timing: "before food" | "after food" | "with food" | "";
  days: number;
  price: number; // per unit selling price
};

export type Visit = {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  date: Timestamp;
  diagnosis: string;
  items: VisitItem[];
  consultationFee: number;
  medicinesAmount: number;
  totalAmount: number;
  paymentMode: "cash" | "upi" | "card" | "unpaid";
  printedAt: Timestamp | null;
  createdBy: string;
};

export type LedgerType = "purchase" | "sale" | "adjustment" | "payment";

export type LedgerEntry = {
  id: string;
  type: LedgerType;
  refId: string; // purchase/visit/payment id
  clinicId: string;
  summary: string; // human-readable line
  medicineDeltas: { medicineId: string; medicineName: string; delta: number }[];
  amount: number; // cash moved in this event (+in / -out); purchase rows use paid-at-time only
  purchaseTotal?: number; // full invoice amount for purchase/payment rows
  byUid: string;
  at: Timestamp;
};

export type Invite = {
  id: string; // the invite code
  accountId: string;
  accountName: string;
  role: Role;
  clinicIds: string[];
  createdBy: string;
  expiresAt: Timestamp;
  usedBy: string | null;
};

export type UserDoc = {
  uid: string;
  name: string;
  email: string;
  accountId: string | null;
  createdAt: Timestamp;
};
