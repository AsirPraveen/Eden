import { StaffPermissions } from "../types/models";

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  purchase: false,
  addMedicine: false,
  reports: false,
  inventory: false,
  sales: true,
  expenses: false,
  patientManagement: true,
  supplierManagement: false,
};

export const FULL_STAFF_PERMISSIONS: StaffPermissions = {
  purchase: true,
  addMedicine: true,
  reports: true,
  inventory: true,
  sales: true,
  expenses: true,
  patientManagement: true,
  supplierManagement: true,
};

export type PermissionKey = keyof StaffPermissions;

export const PERMISSION_LABELS: Record<PermissionKey, { title: string; description: string }> = {
  purchase: { title: "Allow Purchase", description: "Record stock purchases from reps" },
  addMedicine: { title: "Allow Add Medicine", description: "Add new medicines to the catalog" },
  reports: { title: "Allow Reports", description: "View revenue and analytics reports" },
  inventory: { title: "Allow Inventory", description: "View stock, batches, and adjustments" },
  sales: { title: "Allow Sales", description: "Prescribe and bill patients" },
  expenses: { title: "Allow Expenses", description: "View dues and record payments to reps" },
  patientManagement: { title: "Allow Patient Management", description: "Register and manage patients" },
  supplierManagement: { title: "Allow Supplier Management", description: "Add and edit medical reps" },
};

export function mergeStaffPermissions(perms?: StaffPermissions | null): StaffPermissions {
  return { ...DEFAULT_STAFF_PERMISSIONS, ...perms };
}
