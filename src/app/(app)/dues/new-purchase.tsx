import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, getDoc, orderBy, query, serverTimestamp, where, limit } from "firebase/firestore";
import { Badge, Button, Card, Input, Screen, Text } from "../../../components/base";
import { DatePickerField } from "../../../components/DatePickerField";
import { MonthPickerField } from "../../../components/MonthPickerField";
import { PermissionGate } from "../../../components/PermissionGate";
import { AddItemButton, PickerRow } from "../../../components/PickerRow";
import { PickerModal } from "../../../components/PickerModal";
import { ClinicContextBadge } from "../../../components/ClinicContextBadge";
import { useCollection } from "../../../hooks/useFirestore";
import { scheduleDueReminders } from "../../../services/notifications";
import { medicinesCol, purchaseDoc, purchasesCol, suppliersCol } from "../../../services/paths";
import { computeDueDate, recordPurchase } from "../../../services/purchases";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Medicine, Purchase, PurchaseItem, Supplier } from "../../../types/models";
import { formatDate, formatMoney } from "../../../utils/format";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../../utils/phone";

type NewSupplierField = "company" | "phone";

type DraftItem = PurchaseItem & { key: string };

export default function NewPurchase() {
  const { colors } = useTheme();
  const { accountId, clinicId, user } = useSession();

  const { data: suppliers } = useCollection<Supplier>(
    () =>
      accountId && clinicId
        ? query(suppliersCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );
  const { data: medicines } = useCollection<Medicine>(
    () =>
      accountId && clinicId
        ? query(medicinesCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );
  const { data: recentPurchases } = useCollection<Purchase>(
    () =>
      accountId && clinicId
        ? query(
            purchasesCol(accountId),
            where("clinicId", "==", clinicId),
            orderBy("date", "desc"),
            limit(50)
          )
        : null,
    [accountId, clinicId]
  );

  const lastCostByMedicine = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of recentPurchases) {
      for (const it of p.items) {
        if (it.costPrice > 0 && !map.has(it.medicineId)) {
          map.set(it.medicineId, it.costPrice);
        }
      }
    }
    return map;
  }, [recentPurchases]);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [creditDays, setCreditDays] = useState("50");
  const [paidNow, setPaidNow] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [showGst, setShowGst] = useState(false);
  const [invoiceTotal, setInvoiceTotal] = useState("");

  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [medicinePickerOpen, setMedicinePickerOpen] = useState(false);
  const [newRepName, setNewRepName] = useState("");
  const [newRepCompany, setNewRepCompany] = useState("");
  const [newRepPhone, setNewRepPhone] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [supplierErrors, setSupplierErrors] = useState<FieldErrors<NewSupplierField>>(EMPTY_FIELD_ERRORS);

  const total = useMemo(() => items.reduce((s, it) => s + it.qty * it.costPrice, 0), [items]);
  const dueDate = useMemo(
    () => computeDueDate(purchaseDate, parseInt(creditDays, 10) || 0),
    [purchaseDate, creditDays]
  );

  const updateItem = (key: string, patch: Partial<PurchaseItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const addSupplier = async () => {
    if (!accountId || !clinicId) return;
    const next: FieldErrors<NewSupplierField> = {};
    if (!newRepName.trim() && !newRepCompany.trim()) next.company = "Enter the rep or company name.";
    const phoneErr = indianPhoneErrorOptional(newRepPhone);
    if (phoneErr) next.phone = phoneErr;
    if (Object.keys(next).length > 0) {
      setSupplierErrors(next);
      return;
    }
    setSupplierErrors(EMPTY_FIELD_ERRORS);
    const storedPhone = newRepPhone.trim() ? storageIndianPhone(newRepPhone) : "";
    const ref = await addDoc(suppliersCol(accountId), {
      clinicId,
      repName: newRepName.trim(),
      company: newRepCompany.trim(),
      phone: storedPhone,
      notes: "",
      active: true,
      createdAt: serverTimestamp(),
    });
    setSupplier({
      id: ref.id,
      clinicId,
      repName: newRepName.trim(),
      company: newRepCompany.trim(),
      phone: storedPhone,
      notes: "",
      active: true,
    } as Supplier);
    setAddingSupplier(false);
    setNewRepName("");
    setNewRepCompany("");
    setNewRepPhone("");
  };

  const save = async () => {
    if (!accountId || !clinicId || !user) return;
    if (!supplier) return Alert.alert("Choose the supplier (rep)");
    if (items.length === 0) return Alert.alert("Add at least one medicine");
    for (const it of items) {
      if (!(it.qty > 0)) return Alert.alert("Check quantities", `${it.medicineName} has no quantity.`);
      if (!(it.costPrice >= 0)) return Alert.alert("Check cost prices", `${it.medicineName} has no cost price.`);
    }
    setBusy(true);
    try {
      const days = parseInt(creditDays, 10) || 0;
      const parsedInvoiceTotal = showGst && invoiceTotal ? parseFloat(invoiceTotal) || 0 : undefined;
      const gstAmt = parsedInvoiceTotal !== undefined ? Math.max(0, parsedInvoiceTotal - total) : undefined;
      const purchaseId = await recordPurchase({
        accountId,
        clinicId,
        supplierId: supplier.id,
        supplierName: supplier.company || supplier.repName,
        invoiceNo,
        items: items.map(({ key, ...it }) => it),
        creditDays: days,
        date: purchaseDate,
        dueDate,
        paidNow: parseFloat(paidNow) || 0,
        byUid: user.uid,
        invoiceTotal: parsedInvoiceTotal,
        gstAmount: gstAmt,
      });
      const snap = await getDoc(purchaseDoc(accountId, purchaseId));
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Purchase;
        if (p.status !== "paid") scheduleDueReminders(p).catch(() => {});
      }
      router.back();
    } catch (e) {
      Alert.alert("Could not save purchase", (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <PermissionGate permission="purchase">
      <Screen keyboardOffset={44}>
        <ClinicContextBadge />
        <PickerRow
          icon="business-outline"
          label="Supplier (rep / company)"
          required
          value={supplier ? supplier.company || supplier.repName : null}
          subtitle={supplier && supplier.repName && supplier.company ? supplier.repName : undefined}
          placeholder="Choose supplier"
          onPress={() => setSupplierPickerOpen(true)}
        />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Input label="Invoice no." value={invoiceNo} onChangeText={setInvoiceNo} containerStyle={{ flex: 1 }} />
          <DatePickerField
            label="Purchase date"
            required
            value={purchaseDate}
            onChange={setPurchaseDate}
            containerStyle={{ flex: 1, marginBottom: spacing.md }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
          <Input
            label="Credit days"
            required
            value={creditDays}
            onChangeText={setCreditDays}
            keyboardType="number-pad"
            containerStyle={{ width: 120 }}
          />
          <View style={{ flex: 1, justifyContent: "center", paddingTop: spacing.lg }}>
            <Text variant="caption" color={colors.textSecondary}>
              Payment due {formatDate(dueDate)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
          <Text variant="caption">Medicines</Text>
          <Text variant="caption" color={colors.danger}>
            {" *"}
          </Text>
        </View>
        {items.map((it) => (
          <Card key={it.key} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Text variant="body" style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {it.medicineName}
              </Text>
              <Pressable onPress={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Input
                label="Qty"
                required
                value={it.qty ? String(it.qty) : ""}
                onChangeText={(v) => updateItem(it.key, { qty: parseInt(v, 10) || 0 })}
                keyboardType="number-pad"
                containerStyle={{ flex: 1, marginBottom: spacing.sm }}
              />
              <Input
                label="Free"
                value={it.freeQty ? String(it.freeQty) : ""}
                onChangeText={(v) => updateItem(it.key, { freeQty: parseInt(v, 10) || 0 })}
                keyboardType="number-pad"
                containerStyle={{ flex: 1, marginBottom: spacing.sm }}
              />
              <Input
                label="Cost/unit ₹"
                required
                value={it.costPrice ? String(it.costPrice) : ""}
                onChangeText={(v) => updateItem(it.key, { costPrice: parseFloat(v) || 0 })}
                keyboardType="decimal-pad"
                containerStyle={{ flex: 1.4, marginBottom: spacing.sm }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Input
                label="Batch no."
                value={it.batchNo}
                onChangeText={(v) => updateItem(it.key, { batchNo: v })}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <MonthPickerField
                label="Expiry"
                value={it.expiry}
                onChange={(v) => updateItem(it.key, { expiry: v })}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
            </View>
          </Card>
        ))}
        <View style={{ marginBottom: spacing.xl }}>
          <AddItemButton title="Add medicine" onPress={() => setMedicinePickerOpen(true)} />
        </View>

        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="body">Total</Text>
            <Text variant="subheading">{formatMoney(total)}</Text>
          </View>

          <Pressable
            onPress={() => setShowGst(!showGst)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginTop: spacing.md,
              marginBottom: showGst ? spacing.sm : 0,
            }}
          >
            <Ionicons name={showGst ? "chevron-down" : "chevron-forward"} size={16} color={colors.accent} />
            <Text variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>
              Add GST from invoice
            </Text>
          </Pressable>

          {showGst && (
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <Input
                label="Invoice total (incl. GST) ₹"
                value={invoiceTotal}
                onChangeText={setInvoiceTotal}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: spacing.xs }}
              />
              {invoiceTotal ? (
                <Text variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>
                  GST Amount: {formatMoney(Math.max(0, (parseFloat(invoiceTotal) || 0) - total))}
                </Text>
              ) : null}
            </View>
          )}

          <Input
            label="Paid now (leave empty if fully on credit)"
            value={paidNow}
            onChangeText={setPaidNow}
            keyboardType="decimal-pad"
            containerStyle={{ marginTop: spacing.md, marginBottom: 0 }}
          />
        </Card>

        <Button title="Save purchase" onPress={save} loading={busy} />

        <PickerModal
          visible={supplierPickerOpen && !addingSupplier}
          title="Choose supplier"
          items={suppliers.map((s) => ({
            id: s.id,
            title: s.company || s.repName,
            subtitle: [s.repName && s.company ? s.repName : "", s.phone].filter(Boolean).join(" · "),
          }))}
          onSelect={(item) => {
            setSupplier(suppliers.find((s) => s.id === item.id) ?? null);
            setSupplierPickerOpen(false);
          }}
          onClose={() => setSupplierPickerOpen(false)}
          onCreateNew={(text) => {
            setNewRepCompany(text);
            setAddingSupplier(true);
          }}
          createLabel="Add new supplier"
        />

        <Modal visible={addingSupplier} transparent animationType="fade" onRequestClose={() => setAddingSupplier(false)}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddingSupplier(false)} />
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <Card style={styles.modalCard}>
                <Text variant="subheading" style={{ marginBottom: spacing.md }}>
                  New supplier
                </Text>
                <Input
                  label="Company"
                  required
                  value={newRepCompany}
                  onChangeText={(v) => {
                    setNewRepCompany(v);
                    setSupplierErrors((e) => withoutField(e, "company"));
                  }}
                  autoFocus
                  error={supplierErrors.company}
                />
                <Input label="Rep name" value={newRepName} onChangeText={setNewRepName} />
                <Input
                  label="Phone"
                  value={newRepPhone}
                  onChangeText={(v) => {
                    setNewRepPhone(v);
                    setSupplierErrors((e) => withoutField(e, "phone"));
                  }}
                  keyboardType="phone-pad"
                  error={supplierErrors.phone}
                />
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <Button title="Cancel" variant="ghost" onPress={() => setAddingSupplier(false)} style={{ flex: 1 }} />
                  <Button
                    title="Save"
                    onPress={() => addSupplier().then(() => setSupplierPickerOpen(false))}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <PickerModal
          visible={medicinePickerOpen}
          title="Add medicine"
          items={medicines.map((m) => ({
            id: m.id,
            title: m.name,
            subtitle: [m.genericName, m.form].filter(Boolean).join(" · "),
          }))}
          onSelect={(item) => {
            const m = medicines.find((x) => x.id === item.id);
            if (!m) return;
            const lastCost = lastCostByMedicine.get(m.id) ?? 0;
            setItems((prev) => [
              ...prev,
              {
                key: `${m.id}_${Date.now()}`,
                medicineId: m.id,
                medicineName: m.name,
                batchNo: "",
                expiry: "",
                qty: 0,
                costPrice: lastCost,
                freeQty: 0,
              },
            ]);
            setMedicinePickerOpen(false);
          }}
          onClose={() => setMedicinePickerOpen(false)}
          onCreateNew={() => {
            setMedicinePickerOpen(false);
            router.push("/(app)/stock/new-medicine");
          }}
          createLabel="Create new medicine"
        />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
});
