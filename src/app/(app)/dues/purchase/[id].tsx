import React, { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, IconCircle, Input, ListRow, Screen, SelectChip, Text } from "../../../../components/base";
import { useCollection, useDoc } from "../../../../hooks/useFirestore";
import { cancelDueReminders } from "../../../../services/notifications";
import { purchaseDoc, supplierDoc } from "../../../../services/paths";
import { recordPayment } from "../../../../services/purchases";
import { useSession } from "../../../../stores/useSession";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../theme/tokens";
import { Payment, Purchase, Supplier } from "../../../../types/models";
import { dueLabel, formatDate, formatMoney } from "../../../../utils/format";

const MODES: { key: Payment["mode"]; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "cash", icon: "cash-outline" },
  { key: "upi", icon: "phone-portrait-outline" },
  { key: "bank", icon: "business-outline" },
  { key: "other", icon: "ellipsis-horizontal-outline" },
];

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { accountId, user } = useSession();

  const { data: purchase } = useDoc<Purchase>(
    () => (accountId && id ? purchaseDoc(accountId, id) : null),
    [accountId, id]
  );
  const { data: supplier } = useDoc<Supplier>(
    () => (accountId && purchase ? supplierDoc(accountId, purchase.supplierId) : null),
    [accountId, purchase?.supplierId]
  );

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Payment["mode"]>("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!purchase) return <Screen scroll={false}><View /></Screen>;

  const outstanding = purchase.totalAmount - (purchase.paidAmount || 0);
  const due = dueLabel(purchase.dueDate.toDate());

  const pay = async () => {
    if (!accountId || !user) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) return Alert.alert("Enter a valid amount");
    setBusy(true);
    try {
      await recordPayment({ accountId, purchase, amount: amt, mode, note, byUid: user.uid });
      if (amt >= outstanding - 0.01) cancelDueReminders(purchase.id).catch(() => {});
      setAmount("");
      setNote("");
    } catch (e) {
      Alert.alert("Could not record payment", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: purchase.supplierName }} />

      <View
        style={{
          backgroundColor: purchase.status === "paid" ? colors.accentSoft : due.tone === "danger" ? colors.dangerSoft : colors.warningSoft,
          borderRadius: 20,
          padding: spacing.lg,
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <IconCircle
            name={purchase.status === "paid" ? "checkmark-circle" : "card"}
            tone={purchase.status === "paid" ? "accent" : due.tone === "danger" ? "danger" : "warning"}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <Text
              variant="caption"
              style={{ fontWeight: "600" }}
              color={purchase.status === "paid" ? colors.accent : due.tone === "danger" ? colors.danger : colors.warning}
            >
              {purchase.status === "paid" ? "Settled" : due.text}
            </Text>
            <Text
              variant="title"
              style={{ marginTop: 2 }}
              color={purchase.status === "paid" ? colors.accent : due.tone === "danger" ? colors.danger : colors.warning}
            >
              {formatMoney(purchase.status === "paid" ? purchase.totalAmount : outstanding)}
            </Text>
          </View>
        </View>
        <Text variant="caption" style={{ marginTop: spacing.md }} color={colors.textSecondary}>
          {purchase.invoiceNo ? `Invoice ${purchase.invoiceNo} · ` : ""}
          Purchased {formatDate(purchase.date.toDate())} · Due {formatDate(purchase.dueDate.toDate())} ({purchase.creditDays} days credit)
        </Text>
        {supplier?.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${supplier.phone}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md }}
          >
            <Ionicons name="call-outline" size={16} color={colors.accent} />
            <Text variant="body" color={colors.accent} style={{ fontWeight: "600" }}>
              Call {supplier.repName || supplier.company} ({supplier.phone})
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Card style={{ marginBottom: spacing.md, padding: 0 }}>
        <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
          Items
        </Text>
        {purchase.items.map((it, i) => (
          <ListRow
            key={i}
            title={it.medicineName}
            subtitle={`${it.batchNo ? `Batch ${it.batchNo} · ` : ""}${it.expiry ? `Exp ${it.expiry}` : ""}`}
            right={formatMoney(it.qty * it.costPrice)}
            rightSub={`${it.qty}${it.freeQty ? ` +${it.freeQty} free` : ""} × ${formatMoney(it.costPrice)}`}
          />
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.lg }}>
          <Text variant="body" style={{ fontWeight: "600" }}>
            Total
          </Text>
          <Text variant="body" style={{ fontWeight: "600" }}>
            {formatMoney(purchase.totalAmount)}
          </Text>
        </View>
      </Card>

      {(purchase.payments?.length ?? 0) > 0 && (
        <Card style={{ marginBottom: spacing.md, padding: 0 }}>
          <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
            Payments
          </Text>
          {purchase.payments.map((p, i) => (
            <ListRow
              key={i}
              title={formatMoney(p.amount)}
              subtitle={`${formatDate(p.date.toDate())} · ${p.mode}${p.note ? ` · ${p.note}` : ""}`}
            />
          ))}
        </Card>
      )}

      {purchase.status !== "paid" && (
        <Card>
          <Text variant="label" style={{ marginBottom: spacing.md }}>
            Record payment
          </Text>
          <Input
            label={`Amount (up to ${formatMoney(outstanding)})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
            {MODES.map((m) => (
              <SelectChip key={m.key} icon={m.icon} label={m.key} selected={mode === m.key} onPress={() => setMode(m.key)} />
            ))}
          </View>
          <Input label="Note" value={note} onChangeText={setNote} />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Button
              title="Pay full"
              variant="secondary"
              onPress={() => setAmount(String(outstanding))}
              style={{ flex: 1 }}
            />
            <Button title="Record" onPress={pay} loading={busy} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </Screen>
  );
}
