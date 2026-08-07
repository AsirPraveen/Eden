import React from "react";
import { EmptyState } from "./base";
import { usePermissions } from "../hooks/usePermissions";
import { DEFAULT_STAFF_PERMISSIONS, mergeStaffPermissions, PermissionKey, PERMISSION_LABELS } from "../services/permissions";

/** Blocks children when the current staff member lacks a permission. */
export function PermissionGate({
  permission,
  anyOf,
  children,
}: {
  permission?: PermissionKey;
  anyOf?: PermissionKey[];
  children: React.ReactNode;
}) {
  const perms = usePermissions();
  if (!perms.isStaff) return <>{children}</>;
  const allowed = anyOf ? anyOf.some((k) => perms[k]) : permission ? perms[permission] : true;
  if (allowed) return <>{children}</>;
  const key = permission ?? anyOf?.[0];
  const label = key ? PERMISSION_LABELS[key] : { title: "this feature", description: "" };
  return (
    <EmptyState
      title="Access restricted"
      message={`Your doctor has not enabled "${label.title}" for your account. Ask them to update staff permissions in Settings.`}
    />
  );
}
