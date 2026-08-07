import React, { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { orderBy, query, where } from "firebase/firestore";
import { Avatar, Badge, Button, Card, EmptyState, ListRow, LoadingState, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCollection } from "../../../hooks/useFirestore";
import { purchasesCol, suppliersCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../../theme/tokens";
import { Purchase, Supplier } from "../../../types/models";
import { dueLabel, formatMoney } from "../../../utils/format";

type Tab = "due" | "history";

export default function Dues() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const perms = usePermissions();
  const [tab, setTab] = useState<Tab>("due");

  const { data: unpaid, loading } = useCollection<Purchase>(
    () =>
      accountId && clinicId
        ? query(
            purchasesCol(accountId),
            where("clinicId", "==", clinicId),
            where("status", "in", ["unpaid", "partial"]),
            orderBy("dueDate", "asc")
          )
        : null,
    [accountId, clinicId]
  );
  const { data: allRecent } = useCollection<Purchase>(
    () =>
      accountId && clinicId
        ? query(purchasesCol(accountId), where("clinicId", "==", clinicId), orderBy("date", "desc"))
        : null,
    [accountId, clinicId]
  );
  const { data: suppliers } = useCollection<Supplier>(
    () => (accountId && clinicId ? query(suppliersCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );
  const phoneBySupplier = useMemo(() => new Map(suppliers.map((s) => [s.id, s.phone])), [suppliers]);

  const totalOutstanding = useMemo(
    () => unpaid.reduce((s, p) => s + (p.totalAmount - (p.paidAmount || 0)), 0),
    [unpaid]
  );

  const list = tab === "due" ? unpaid : allRecent;

  return (
    <PermissionGate anyOf={["expenses", "purchase"]}>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        <Card>
          <Text variant="label">Total outstanding</Text>
          <Text variant="heading" style={{ marginTop: spacing.xs }}>
            {formatMoney(totalOutstanding)}
          </Text>
          <Text variant="caption" style={{ marginTop: 2 }}>
            {unpaid.length} pending invoice{unpaid.length === 1 ? "" : "s"}
          </Text>
        </Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <Pressable onPress={() => setTab("due")}>
            <Badge text="To pay" tone={tab === "due" ? "accent" : "neutral"} />
          </Pressable>
          <Pressable onPress={() => setTab("history")}>
            <Badge text="All purchases" tone={tab === "history" ? "accent" : "neutral"} />
          </Pressable>
          <View style={{ flex: 1 }} />
          {perms.purchase && (
            <Button title="Record purchase" compact variant="secondary" onPress={() => router.push("/(app)/dues/new-purchase")} />
          )}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        renderItem={({ item }) => {
          const outstanding = item.totalAmount - (item.paidAmount || 0);
          const due = dueLabel(item.dueDate.toDate());
          const phone = phoneBySupplier.get(item.supplierId);
          return (
            <ListRow
              title={item.supplierName}
              left={<Avatar name={item.supplierName} />}
              subtitle={`${item.invoiceNo ? `Inv ${item.invoiceNo} · ` : ""}${item.items.length} item${item.items.length === 1 ? "" : "s"}${item.status === "partial" ? ` · ${formatMoney(item.paidAmount)} paid` : ""}`}
              right={
                <Text variant="body" style={{ fontWeight: "600" }}>
                  {formatMoney(tab === "due" ? outstanding : item.totalAmount)}
                </Text>
              }
              rightSub={
                item.status === "paid" ? (
                  <Badge tone="neutral" text="Paid" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 }}>
                    <Badge
                      tone={due.tone === "danger" ? "danger" : due.tone === "warning" ? "warning" : "neutral"}
                      text={due.text}
                    />
                    {phone ? (
                      <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} hitSlop={8}>
                        <Ionicons name="call-outline" size={18} color={colors.accent} />
                      </Pressable>
                    ) : null}
                  </View>
                )
              }
              onPress={() => router.push(`/(app)/dues/purchase/${item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Loading purchases…" />
          ) : (
            <EmptyState
              icon="card-outline"
              title={tab === "due" ? "Nothing to pay" : "No purchases yet"}
              message={
                tab === "due"
                  ? "All rep invoices are settled."
                  : "When a rep supplies medicines, record the purchase here. Stock updates automatically and the app tracks the payment due date."
              }
              actionTitle="Record purchase"
              onAction={perms.purchase ? () => router.push("/(app)/dues/new-purchase") : undefined}
            />
          )
        }
      />
    </View>
    </PermissionGate>
  );
}
