import { useDoc } from "./useFirestore";
import { accountDoc } from "../services/paths";
import { useSession, useCanManage } from "../stores/useSession";
import { Account, StaffPermissions } from "../types/models";
import { mergeStaffPermissions, FULL_STAFF_PERMISSIONS } from "../services/permissions";

/** Resolved staff permissions for the current member. Doctors/owners always have full access. */
export function usePermissions(): StaffPermissions & { isStaff: boolean; canManage: boolean } {
  const { accountId, member } = useSession();
  const canManage = useCanManage();

  const { data: account } = useDoc<Account>(
    () => (accountId ? accountDoc(accountId) : null),
    [accountId]
  );

  const isStaff = member?.role === "staff";

  if (!isStaff || canManage) {
    return { ...FULL_STAFF_PERMISSIONS, isStaff: false, canManage: !!canManage };
  }

  return {
    ...mergeStaffPermissions(account?.staffPermissions),
    isStaff: true,
    canManage: false,
  };
}

export function useCan(key: keyof StaffPermissions): boolean {
  const perms = usePermissions();
  return perms[key];
}
