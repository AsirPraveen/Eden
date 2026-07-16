// ─── Eden App Types ───────────────────────────────────────────

// ─── User ─────────────────────────────────────────────────────

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  licenseNo?: string;
  signatureData?: string; // SVG path data for doctor signature
  clinicIds: string[];
  activeClinicId: string | null;
  createdAt: Date;
};

// ─── Clinic (Workspace) ──────────────────────────────────────

export type ClinicRole = 'owner' | 'doctor' | 'staff';

export type ClinicMember = {
  uid: string;
  name: string;
  email: string;
  role: ClinicRole;
  joinedAt: Date;
};

export type ClinicSettings = {
  prescriptionHeader?: string;
  prescriptionFooter?: string;
  defaultPaymentTermDays: number;
  lowStockThreshold: number;
};

export type Clinic = {
  id: string;
  name: string;
  address: string;
  phone: string;
  doctorRegNo?: string;
  logoUrl?: string;
  ownerId: string;
  settings: ClinicSettings;
  createdAt: Date;
};

// ─── Medicine / Inventory ────────────────────────────────────

export type MedicineCategory =
  | 'Tablets'
  | 'Capsules'
  | 'Syrups'
  | 'Injections'
  | 'Ointments'
  | 'Drops'
  | 'Surgical'
  | 'Others';

export type Medicine = {
  id: string;
  name: string;
  category: MedicineCategory;
  manufacturer?: string;
  unit: string; // e.g., "strip", "bottle", "box"
  currentStock: number;
  reorderLevel: number;
  avgPurchasePrice: number;
  sellingPrice: number;
  createdAt: Date;
  lastUpdated: Date;
};

// ─── Stock Entry ─────────────────────────────────────────────

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type StockEntry = {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  batchNo?: string;
  expiryDate?: Date;
  purchasePrice: number;
  sellingPrice: number;
  repId: string;
  repName: string;
  companyName: string;
  paymentTermDays: number;
  paymentDueDate: Date;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  totalAmount: number;
  createdAt: Date;
};

// ─── Patient ─────────────────────────────────────────────────

export type Patient = {
  id: string;
  name: string;
  phone: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  notes?: string;
  visitCount: number;
  lastVisit?: Date;
  createdAt: Date;
};

// ─── Prescription ────────────────────────────────────────────

export type DosageTiming = 'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach' | 'As Directed';

export type PrescriptionItem = {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string; // e.g., "1-0-1", "1-1-1", "0-0-1"
  timing: DosageTiming;
  duration: number; // days
  instructions?: string;
  unitPrice: number;
  amount: number;
};

export type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  doctorId: string;
  doctorName: string;
  items: PrescriptionItem[];
  totalAmount: number;
  notes?: string;
  diagnosis?: string;
  createdAt: Date;
};

// ─── Medical Rep ─────────────────────────────────────────────

export type MedicalRep = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  visitDay?: string; // e.g., "Monday", "Every 2 weeks"
  notes?: string;
  totalPurchases: number;
  totalOutstanding: number;
  createdAt: Date;
};

// ─── Payment ─────────────────────────────────────────────────

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';

export type Payment = {
  id: string;
  repId: string;
  repName: string;
  stockEntryIds: string[];
  amount: number;
  mode: PaymentMode;
  reference?: string;
  notes?: string;
  date: Date;
  createdAt: Date;
};

// ─── Analytics (Daily Aggregate) ─────────────────────────────

export type DailyAnalytics = {
  date: string; // YYYY-MM-DD
  revenue: number;
  prescriptionCount: number;
  patientCount: number;
  newPatients: number;
  stockValue: number;
  medicinesSold: number;
};

// ─── Navigation Types ────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ClinicSelection: undefined;
  MainApp: undefined;
  MedicineDetails: { medicineId: string };
  AddMedicine: undefined;
  StockEntry: { medicineId?: string };
  PatientList: undefined;
  PatientDetails: { patientId: string };
  AddPatient: undefined;
  PrescriptionForm: { patientId?: string };
  PrescriptionDetail: { prescriptionId: string };
  PrescriptionHistory: undefined;
  RepDetails: { repId: string };
  AddRep: undefined;
  PaymentTracker: { repId?: string };
  Analytics: undefined;
  Settings: undefined;
};
