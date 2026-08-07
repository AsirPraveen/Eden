import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export const usersCol = () => collection(db, "users");
export const userDoc = (uid: string) => doc(db, "users", uid);
export const invitesCol = () => collection(db, "invites");
export const inviteDoc = (code: string) => doc(db, "invites", code);

export const accountDoc = (accountId: string) => doc(db, "accounts", accountId);
export const membersCol = (accountId: string) => collection(db, "accounts", accountId, "members");
export const memberDoc = (accountId: string, uid: string) =>
  doc(db, "accounts", accountId, "members", uid);
export const clinicsCol = (accountId: string) => collection(db, "accounts", accountId, "clinics");
export const clinicDoc = (accountId: string, clinicId: string) =>
  doc(db, "accounts", accountId, "clinics", clinicId);
export const suppliersCol = (accountId: string) =>
  collection(db, "accounts", accountId, "suppliers");
export const supplierDoc = (accountId: string, id: string) =>
  doc(db, "accounts", accountId, "suppliers", id);
export const medicinesCol = (accountId: string) =>
  collection(db, "accounts", accountId, "medicines");
export const medicineDoc = (accountId: string, id: string) =>
  doc(db, "accounts", accountId, "medicines", id);
export const stockCol = (accountId: string) => collection(db, "accounts", accountId, "stock");
export const stockDoc = (accountId: string, clinicId: string, medicineId: string) =>
  doc(db, "accounts", accountId, "stock", `${clinicId}_${medicineId}`);
export const purchasesCol = (accountId: string) =>
  collection(db, "accounts", accountId, "purchases");
export const purchaseDoc = (accountId: string, id: string) =>
  doc(db, "accounts", accountId, "purchases", id);
export const patientsCol = (accountId: string) => collection(db, "accounts", accountId, "patients");
export const patientDoc = (accountId: string, id: string) =>
  doc(db, "accounts", accountId, "patients", id);
export const visitsCol = (accountId: string) => collection(db, "accounts", accountId, "visits");
export const visitDoc = (accountId: string, id: string) =>
  doc(db, "accounts", accountId, "visits", id);
export const ledgerCol = (accountId: string) => collection(db, "accounts", accountId, "ledger");
