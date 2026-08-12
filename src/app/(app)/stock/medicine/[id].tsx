import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { query, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Badge, Button, Card, IconCircle, Input, ListRow, Screen, SelectChip, Text } from "../../../../components/base";
import { ClinicContextBadge } from "../../../../components/ClinicContextBadge";
import { useCollection, useDoc } from "../../../../hooks/useFirestore";
import { clinicDoc, medicineDoc, purchasesCol, stockDoc } from "../../../../services/paths";
import { adjustStock } from "../../../../services/visits";
import { useCanManage, useSession } from "../../../../stores/useSession";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../theme/tokens";
import { Clinic, Medicine, Purchase, StockDoc } from "../../../../types/models";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../../utils/formErrors";
import { formatDate, formatMoney, isExpired, monthsToExpiry } from "../../../../utils/format";
import { DEFAULT_FORMS, iconForForm, unitForForm } from "../../../../utils/medicineConstants";

type EditField = "name" | "price" | "threshold" | "customForm" | "_form";

export default function MedicineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { accountId, clinicId, user } = useSession();
  const canManage = useCanManage();

  const { data: medicine } = useDoc<Medicine>(
    () => (accountId && id ? medicineDoc(accountId, id) : null),
    [accountId, id]
  );
  const { data: clinic } = useDoc<Clinic>(
    () => (accountId && clinicId ? clinicDoc(accountId, clinicId) : null),
    [accountId, clinicId]
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
  const [returnOpen, setReturnOpen] = useState(false); // #12: collapsible Return to Rep
  const [editName, setEditName] = useState(""); // #1: editable name
  const [editForm, setEditForm] = useState(""); // #1: editable form
  const [customFormInput, setCustomFormInput] = useState("");
  const [genericName, setGenericName] = useState("");
  const [price, setPrice] = useState("");
  const [threshold, setThreshold] = useState("");
  const [editErrors, setEditErrors] = useState<FieldErrors<EditField>>(EMPTY_FIELD_ERRORS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!medicine) return;
    setEditName(medicine.name);
    
    const defaults = DEFAULT_FORMS as readonly string[];
    const isDefault = defaults.includes(medicine.form);
    const isCustom = (clinic?.customForms || []).includes(medicine.form);
    
    if (isDefault || isCustom) {
      setEditForm(medicine.form);
      setCustomFormInput("");
    } else {
      setEditForm("other");
      setCustomFormInput(medicine.form);
    }
    
    setGenericName(medicine.genericName ?? "");
    setPrice(String(medicine.defaultPrice ?? ""));
    setThreshold(String(medicine.lowStockThreshold ?? 0));
  }, [medicine, clinic]);

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

  // #12: Fixed — validates qty before adjusting, prevents NaN
  const doAdjust = async (sign: 1 | -1) => {
    if (!accountId || !clinicId || !medicine || !user) return;
    const qty = parseInt(adjustQty, 10);
    if (!adjustQty.trim() || isNaN(qty) || qty <= 0) {
      Alert.alert("Enter quantity", "Please enter a valid return quantity.");
      return;
    }
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
      setReturnOpen(false); // close after successful return
    } catch (e) {
      Alert.alert("Could not adjust stock", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // #14: Fixed — navigates back after deactivation
  const deactivate = () => {
    if (!accountId || !medicine) return;
    Alert.alert("Remove medicine?", "It will be hidden from lists but past records are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await updateDoc(medicineDoc(accountId, medicine.id), { active: false });
          router.back();
        },
      },
    ]);
  };

  // #1: Updated — saves all editable fields including name and form
  const saveEdit = async () => {
    if (!accountId || !medicine || !clinicId) return;
    const next: FieldErrors<EditField> = {};
    if (!editName.trim()) next.name = "Enter the medicine name.";
    const priceNum = parseFloat(price);
    if (!(priceNum >= 0)) next.price = "Enter a valid selling price.";
    const thresholdNum = parseInt(threshold, 10);
    if (!(thresholdNum >= 0)) next.threshold = "Enter a valid low-stock level.";
    if (editForm === "other" && !customFormInput.trim()) {
      next.customForm = "Enter custom form name.";
    }
    if (Object.keys(next).length > 0) {
      setEditErrors(next);
      return;
    }
    setEditErrors(EMPTY_FIELD_ERRORS);
    setSaving(true);
    try {
      const finalForm = editForm === "other" ? customFormInput.trim() : editForm;

      // If a new custom form was entered, persist it to clinic doc
      if (editForm === "other") {
        const nextCustom = [...(clinic?.customForms || [])];
        if (!nextCustom.map((c) => c.toLowerCase()).includes(finalForm.toLowerCase())) {
          nextCustom.push(finalForm);
          await updateDoc(clinicDoc(accountId, clinicId), { customForms: nextCustom });
        }
      }

      await updateDoc(medicineDoc(accountId, medicine.id), {
        name: editName.trim(),
        form: finalForm,
        unit: unitForForm(finalForm),
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
  const currentUnit = medicine.unit;

  // Build form options including custom forms
  const allForms = useMemo(() => {
    const defaults = DEFAULT_FORMS.filter((f) => f !== "other");
    const custom = clinic?.customForms || [];
    return [...defaults, ...custom, "other"];
  }, [clinic?.customForms]);

  return (
    <Screen>
      <Stack.Screen options={{ title: medicine.name }} />
      <ClinicContextBadge />
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
            {qty} {currentUnit}
          </Text>
          <Text variant="caption" style={{ marginTop: 4 }} color={colors.textSecondary}>
            {[medicine.genericName, medicine.form].filter(Boolean).join(" · ")}
            {medicine.defaultPrice ? ` · ${formatMoney(medicine.defaultPrice)}/${currentUnit}` : ""}
          </Text>
        </View>
      </View>

      {/* #1: Edit medicine — all fields now editable */}
      {canManage && (
        <Card style={{ marginBottom: spacing.md }}>
          {editing ? (
            <>
              <Text variant="label" style={{ marginBottom: spacing.md }}>
                Edit medicine
              </Text>
              <Input
                label="Name"
                required
                value={editName}
                onChangeText={(v) => {
                  setEditName(v);
                  setEditErrors((e) => withoutField(e, "name"));
                }}
                error={editErrors.name}
              />
              <Input label="Generic name" value={genericName} onChangeText={setGenericName} />
              <Text variant="caption" style={{ marginBottom: spacing.sm }}>
                Form
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
                {allForms.map((f) => (
                  <SelectChip
                    key={f}
                    icon={iconForForm(f)}
                    label={f}
                    selected={editForm === f}
                    onPress={() => {
                      setEditForm(f);
                      setEditErrors((e) => withoutField(e, "customForm"));
                    }}
                  />
                ))}
              </View>
              {editForm === "other" && (
                <Input
                  label="Custom form name"
                  required
                  value={customFormInput}
                  onChangeText={(v) => {
                    setCustomFormInput(v);
                    setEditErrors((e) => withoutField(e, "customForm"));
                  }}
                  placeholder="e.g. spray, gel, patch"
                  error={editErrors.customForm}
                />
              )}
              <Input
                label={`Selling price per ${unitForForm(editForm === "other" ? customFormInput : editForm)} (₹)`}
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
                subtitle={`Cost ${formatMoney(b.costPrice)}/${currentUnit}`}
                right={`${b.qty} ${currentUnit}`}
                rightSub={b.expiry ? <Badge tone={tone} text={isExpired(b.expiry) ? `Expired ${b.expiry}` : `Exp ${b.expiry}`} /> : undefined}
              />
            );
          })}
        </Card>
      )}

      {/* #12: Return to Rep — now collapsible with validation */}
      <Card style={{ marginBottom: spacing.md }}>
        {returnOpen ? (
          <>
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
                      Total purchased: {s.totalQty} {currentUnit} (Last: {s.lastDate})
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
                        Batch: {b.batchNo || "Unspecified"} ({b.qty} {currentUnit})
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
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setReturnOpen(false);
                  setAdjustQty("");
                  setAdjustReason("");
                  setReturnSupplier(null);
                  setReturnBatch(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Return"
                variant="primary"
                onPress={() => doAdjust(-1)}
                loading={busy}
                style={{ flex: 1, backgroundColor: colors.danger }}
              />
            </View>
          </>
        ) : (
          <Button
            title="Return to Rep"
            variant="secondary"
            onPress={() => setReturnOpen(true)}
          />
        )}
      </Card>

      {/* #14: Remove button — red-toned danger styling + navigates back */}
      {canManage && (
        <Button
          title="Remove medicine"
          variant="ghost"
          onPress={deactivate}
          style={{ marginTop: spacing.xl }}
          textStyle={{ color: colors.danger }}
        />
      )}
    </Screen>
  );
}
