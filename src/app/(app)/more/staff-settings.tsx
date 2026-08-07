import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Card, EmptyState, Screen, Text } from "../../../components/base";
import { useDoc } from "../../../hooks/useFirestore";
import { usePermissions } from "../../../hooks/usePermissions";
import { accountDoc } from "../../../services/paths";
import {
  DEFAULT_STAFF_PERMISSIONS,
  mergeStaffPermissions,
  PERMISSION_LABELS,
  PermissionKey,
} from "../../../services/permissions";
import { useSession, useCanManage } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Account, StaffPermissions } from "../../../types/models";

const ORDER: PermissionKey[] = [
  "sales",
  "patientManagement",
  "inventory",
  "addMedicine",
  "purchase",
  "expenses",
  "supplierManagement",
  "reports",
];

export default function StaffSettings() {
  const { colors } = useTheme();
  const canManage = useCanManage();
  const { accountId, member } = useSession();
  const myPerms = usePermissions();
  const isStaffViewer = member?.role === "staff";
  const { data: account } = useDoc<Account>(() => (accountId ? accountDoc(accountId) : null), [accountId]);
  const [perms, setPerms] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setPerms(mergeStaffPermissions(account?.staffPermissions));
  }, [account?.staffPermissions]);

  if (isStaffViewer) {
    const granted = ORDER.filter((key) => myPerms[key]);
    return (
      <Screen>
        <Text variant="secondary" style={{ marginBottom: spacing.lg }}>
          These are the actions your doctor has allowed you to perform in the app.
        </Text>
        {granted.length === 0 ? (
          <EmptyState title="" message="No permissions have been granted yet. Ask your doctor to update staff permissions." />
        ) : (
          <Card style={{ padding: 0 }}>
            {granted.map((key, index) => {
              const meta = PERMISSION_LABELS[key];
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing.md,
                    padding: spacing.lg,
                    borderBottomWidth: index < granted.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: "600" }}>
                      {meta.title}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                      {meta.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </Screen>
    );
  }

  if (!canManage) return null;

  const toggle = async (key: PermissionKey, value: boolean) => {
    if (!accountId) return;
    const next = { ...perms, [key]: value };
    setPerms(next);
    setSaving(key);
    try {
      await updateDoc(accountDoc(accountId), { staffPermissions: next });
    } catch {
      setPerms(perms);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen>
      <Text variant="secondary" style={{ marginBottom: spacing.lg }}>
        Control what staff members can do in the app. Doctors and owners always have full access.
      </Text>

      <Card style={{ padding: 0 }}>
        {ORDER.map((key) => {
          const meta = PERMISSION_LABELS[key];
          return (
            <View
              key={key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: "600" }}>
                  {meta.title}
                </Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {meta.description}
                </Text>
              </View>
              <Switch
                value={perms[key]}
                onValueChange={(v) => toggle(key, v)}
                disabled={saving === key}
                trackColor={{ false: colors.border, true: colors.accentSoft }}
                thumbColor={perms[key] ? colors.cta : colors.surface}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
