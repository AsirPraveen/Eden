import { Stack, useLocalSearchParams } from "expo-router";
import { query, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Badge, Button, Card, IconCircle, Input, ListRow, Screen, Text } from "../../../../components/base";
import { useCollection, useDoc } from "../../../../hooks/useFirestore";
import { medicineDoc, purchasesCol, stockDoc } from "../../../../services/paths";
import { adjustStock } from "../../../../services/visits";
import { useCanManage, useSession } from "../../../../stores/useSession";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../theme/tokens";
import { Medicine, Purchase, StockDoc } from "../../../../types/models";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../../utils/formErrors";
import { formatDate, formatMoney, isExpired, monthsToExpiry } from "../../../../utils/format";

type EditField = "price" | "threshold" | "_form";

export default function MedicineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { accountId, clinicId, user } = useSession();
  const canManage = useCanManage();

  const { data: medicine } = useDoc<Medicine>(
    () => (accountId && id ? medicineDoc(accountId, id) : null),
    [accountId, id]
  );
  const { data: stock } = useDoc<StockDoc>(
    () => (accountId && clinicId && id ? stockDoc(accountId, clinicId, id) : null),
    [accountId, clinicId, id]
  );
  const { data: purchases } = useCollection<Purchase>(
    () => (accountId ? query(purchasesCol(accountId)) : null),
    [accountId]
  );

  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [returnSupplier, setReturnSupplier] = useState<string | null>(null);
  const [returnBatch, setReturnBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [genericName, setGenericName] = useState("");
  const [price, setPrice] = useState("");
  const [threshold, setThreshold] = useState("");
  const [editErrors, setEditErrors] = useState<FieldErrors<EditField>>(EMPTY_FIELD_ERRORS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!medicine) return;
    setGenericName(medicine.genericName ?? "");
    setPrice(String(medicine.defaultPrice ?? ""));
    setThreshold(String(medicine.lowStockThreshold ?? 0));
  }, [medicine]);

  const supplierHistory = useMemo(() => {
    if (!id || !purchases) return [];
    const map = new Map<string, { supplierId: string; supplierName: string; totalQty: number; lastDate: string }>();
    purchases.forEach((p) => {
      p.items.forEach((item) => {
        if (item.medicineId === id) {
          const prev = map.get(p.supplierId) || {
            supplierId: p.supplierId,
            supplierName: p.supplierName,
            totalQty: 0,
            lastDate: formatDate(p.date.toDate()),
          };
          prev.totalQty += item.qty + (item.freeQty || 0);
          map.set(p.supplierId, prev);
        }
      });
    });
    return Array.from(map.values());
  }, [id, purchases]);

  const batches = useMemo(
    () => (stock?.batches ?? []).filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry)),
    [stock]
  );

  const doAdjust = async (sign: 1 | -1) => {
    if (!accountId || !clinicId || !medicine || !user) return;
    const qty = parseInt(adjustQty, 10);
    const selectedSupplier = supplierHistory.find((s) => s.supplierId === returnSupplier);
    const supplierNote = selectedSupplier ? `[Rep: ${selectedSupplier.supplierName}] ` : "";
    const batchNote = returnBatch ? `[Batch: ${returnBatch}] ` : "";
    const fullReason = `Return to Rep: ${supplierNote}${batchNote}${adjustReason.trim() || "Expired/Damaged return"}`;
    setBusy(true);
    try {
      await adjustStock({
        accountId,
        clinicId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        delta: sign * qty,
        reason: fullReason,
        byUid: user.uid,
        targetBatchNo: returnBatch ?? undefined,
      });
      setAdjustQty("");
      setAdjustReason("");
    } catch (e) {
      Alert.alert("Could not adjust stock", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = () => {
    if (!accountId || !medicine) return;
    Alert.alert("Remove medicine?", "It will be hidden from lists but past records are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => updateDoc(medicineDoc(accountId, medicine.id), { active: false }),
      },
    ]);
  };

  const saveEdit = async () => {
    if (!accountId || !medicine) return;
    const next: FieldErrors<EditField> = {};
    const priceNum = parseFloat(price);
    if (!(priceNum >= 0)) next.price = "Enter a valid selling price.";
    const thresholdNum = parseInt(threshold, 10);
    if (!(thresholdNum >= 0)) next.threshold = "Enter a valid low-stock level.";
    if (Object.keys(next).length > 0) {
      setEditErrors(next);
      return;
    }
    setEditErrors(EMPTY_FIELD_ERRORS);
    setSaving(true);
    try {
      await updateDoc(medicineDoc(accountId, medicine.id), {
        genericName: genericName.trim(),
        defaultPrice: priceNum,
        lowStockThreshold: thresholdNum,
      });
      setEditing(false);
    } catch (e) {
      setEditErrors({ _form: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!medicine) return <Screen scroll={false}><View /></Screen>;

  const qty = stock?.qty ?? 0;
  const low = qty <= (medicine.lowStockThreshold ?? 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: medicine.name }} />
      <View
        style={{
          backgroundColor: low ? colors.dangerSoft : colors.accentSoft,
          borderRadius: 20,
          padding: spacing.lg,
          marginBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <IconCircle name={low ? "alert-circle" : "cube"} tone={low ? "danger" : "accent"} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={low ? colors.danger : colors.accent} style={{ fontWeight: "600" }}>
            {low ? "Low stock - this clinic" : "In stock - this clinic"}
          </Text>
          <Text variant="title" color={low ? colors.danger : colors.accent} style={{ marginTop: 2 }}>
            {qty} {medicine.unit}
          </Text>
          <Text variant="caption" style={{ marginTop: 4 }} color={colors.textSecondary}>
            {[medicine.genericName, medicine.form].filter(Boolean).join(" · ")}
            {medicine.defaultPrice ? ` · ${formatMoney(medicine.defaultPrice)}/${medicine.unit}` : ""}
          </Text>
        </View>
      </View>

      {canManage && (
        <Card style={{ marginBottom: spacing.md }}>
          {editing ? (
            <>
              <Text variant="label" style={{ marginBottom: spacing.md }}>
                Edit medicine
              </Text>
              <Input label="Generic name" value={genericName} onChangeText={setGenericName} />
              <Input
                label={`Selling price per ${medicine.unit} (₹)`}
                value={price}
                onChangeText={(v) => {
                  setPrice(v);
                  setEditErrors((e) => withoutField(e, "price"));
                }}
                keyboardType="decimal-pad"
                error={editErrors.price}
              />
              <Input
                label="Low-stock alert level"
                value={threshold}
                onChangeText={(v) => {
                  setThreshold(v);
                  setEditErrors((e) => withoutField(e, "threshold"));
                }}
                keyboardType="number-pad"
                error={editErrors.threshold ?? editErrors._form}
              />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button title="Save" onPress={saveEdit} loading={saving} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <Button title="Edit medicine" variant="secondary" onPress={() => setEditing(true)} />
          )}
        </Card>
      )}

      {batches.length > 0 && (
        <Card style={{ marginBottom: spacing.md, padding: 0 }}>
          <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
            Batches
          </Text>
          {batches.map((b, i) => {
            const months = monthsToExpiry(b.expiry);
            const tone = isExpired(b.expiry) ? "danger" : months !== null && months <= 3 ? "warning" : "neutral";
            return (
              <ListRow
                key={`${b.batchNo}_${i}`}
                left={<IconCircle name="pricetag-outline" tone={tone} size={34} />}
                title={b.batchNo || "No batch no."}
                subtitle={`Cost ${formatMoney(b.costPrice)}/${medicine.unit}`}
                right={`${b.qty} ${medicine.unit}`}
                rightSub={b.expiry ? <Badge tone={tone} text={isExpired(b.expiry) ? `Expired ${b.expiry}` : `Exp ${b.expiry}`} /> : undefined}
              />
            );
          })}
        </Card>
      )}

      {/* Return to Rep / Supplier */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.xs }}>
          Return to Rep / Supplier
        </Text>
        <Text variant="caption" style={{ marginBottom: spacing.md }} color={colors.textSecondary}>
          Select supplier rep history to return expired or damaged stock.
        </Text>

        {supplierHistory.length > 0 ? (
          <View style={{ marginBottom: spacing.md, gap: spacing.xs }}>
            <Text variant="caption" style={{ fontWeight: "600" }}>
              Supplier History
            </Text>
            {supplierHistory.map((s) => (
              <Pressable
                key={s.supplierId}
                onPress={() => setReturnSupplier(s.supplierId)}
                style={{
                  padding: spacing.md,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: returnSupplier === s.supplierId ? colors.accent : colors.border,
                  backgroundColor: returnSupplier === s.supplierId ? colors.accentSoft : colors.surface,
                }}
              >
                <Text variant="body" style={{ fontWeight: "600" }}>
                  {s.supplierName}
                </Text>
                <Text variant="caption" style={{ marginTop: 2 }}>
                  Total purchased: {s.totalQty} {medicine.unit} (Last: {s.lastDate})
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="caption" style={{ marginBottom: spacing.md }} color={colors.textMuted}>
            No purchase history found for this medicine. Select a general return reason below.
          </Text>
        )}

        {batches.length > 0 && (
          <View style={{ marginBottom: spacing.md, gap: spacing.xs }}>
            <Text variant="caption" style={{ fontWeight: "600" }}>
              Select Batch to Return
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {batches.map((b, idx) => (
                <Pressable
                  key={`${b.batchNo}_${idx}`}
                  onPress={() => setReturnBatch(b.batchNo)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: returnBatch === b.batchNo ? colors.accent : colors.border,
                    backgroundColor: returnBatch === b.batchNo ? colors.accentSoft : colors.surface,
                  }}
                >
                  <Text variant="caption" style={{ fontWeight: "600", color: returnBatch === b.batchNo ? colors.accent : colors.text }}>
                    Batch: {b.batchNo || "Unspecified"} ({b.qty} {medicine.unit})
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Input label="Return quantity" value={adjustQty} onChangeText={setAdjustQty} keyboardType="number-pad" />
        <Input
          label="Reason / Rep note"
          value={adjustReason}
          onChangeText={setAdjustReason}
          placeholder="Expired / Damaged batch return"
        />
        <Button
          title="Return to Rep"
          variant="secondary"
          onPress={() => doAdjust(-1)}
          loading={busy}
        />
      </Card>

      {canManage && (
        <Button title="Remove medicine" variant="ghost" onPress={deactivate} style={{ marginTop: spacing.xl }} />
      )}
    </Screen>
  );
}
