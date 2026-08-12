import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { Badge, Button, Card, SelectChip, Screen, Input, Text } from "../../../components/base";
import { ClinicContextBadge } from "../../../components/ClinicContextBadge";
import { PermissionGate } from "../../../components/PermissionGate";
import { AddItemButton, PickerRow } from "../../../components/PickerRow";
import { PickerModal } from "../../../components/PickerModal";
import { useCollection, useDoc } from "../../../hooks/useFirestore";
import { clinicDoc, medicinesCol, patientsCol, stockCol, treatmentsCol } from "../../../services/paths";
import { saveVisit } from "../../../services/visits";
import { getAutoWhatsApp, setAutoWhatsApp } from "../../../services/preferences";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Clinic, Medicine, Patient, StockDoc, Treatment, Visit, VisitItem, VisitTreatment } from "../../../types/models";
import { formatMoney } from "../../../utils/format";
import { isValidIndianPhone } from "../../../utils/phone";

type DraftItem = VisitItem & { key: string };
type DraftTreatment = VisitTreatment & { key: string };

const DOSAGES = ["1-0-1", "1-1-1", "1-0-0", "0-0-1", "1-1-0", "0-1-0"];
const TIMINGS: { key: VisitItem["timing"]; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "after food", icon: "restaurant-outline" },
  { key: "before food", icon: "time-outline" },
  { key: "with food", icon: "fast-food-outline" },
];
const PAYMENT_MODES: { key: Visit["paymentMode"]; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "cash", icon: "cash-outline" },
  { key: "upi", icon: "phone-portrait-outline" },
  { key: "card", icon: "card-outline" },
  { key: "unpaid", icon: "time-outline" },
];

function dosesPerDay(dosage: string): number {
  return dosage.split("-").reduce((s, x) => s + (parseFloat(x) || 0), 0);
}

export default function Prescribe() {
  const { colors } = useTheme();
  const { patientId: preselectedPatientId } = useLocalSearchParams<{ patientId?: string }>();
  const { accountId, clinicId, user, member } = useSession();

  const { data: patients } = useCollection<Patient>(
    () => (accountId ? query(patientsCol(accountId), orderBy("name")) : null),
    [accountId]
  );
  const { data: medicines } = useCollection<Medicine>(
    () =>
      accountId && clinicId
        ? query(medicinesCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );
  const { data: stock } = useCollection<StockDoc>(
    () => (accountId && clinicId ? query(stockCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );
  const stockByMedicine = useMemo(() => new Map(stock.map((s) => [s.medicineId, s.qty])), [stock]);

  // Clinic doc for discount settings
  const { data: clinic } = useDoc<Clinic>(
    () => (accountId && clinicId ? clinicDoc(accountId, clinicId) : null),
    [accountId, clinicId]
  );

  // #13: Treatments — query existing treatments for this clinic
  const { data: availableTreatments } = useCollection<Treatment>(
    () =>
      accountId && clinicId
        ? query(treatmentsCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );

  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [treatments, setTreatments] = useState<DraftTreatment[]>([]); // #13
  const [consultationFee, setConsultationFee] = useState("");
  const [paymentMode, setPaymentMode] = useState<Visit["paymentMode"]>("cash");
  const [busy, setBusy] = useState(false);
  const [autoWhatsApp, setAutoWhatsAppOn] = useState(false);

  // #2: Discount — prefilled from clinic, editable per prescription
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");

  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [medicinePickerOpen, setMedicinePickerOpen] = useState(false);
  const [treatmentPickerOpen, setTreatmentPickerOpen] = useState(false); // #13

  // #3: "Other" medicine inline form state
  const [otherMedicineName, setOtherMedicineName] = useState("");
  const [otherMedicinePrice, setOtherMedicinePrice] = useState("");
  const [showOtherForm, setShowOtherForm] = useState(false);

  // #13: New treatment inline form state
  const [newTreatmentName, setNewTreatmentName] = useState("");
  const [newTreatmentPrice, setNewTreatmentPrice] = useState("");
  const [showNewTreatmentForm, setShowNewTreatmentForm] = useState(false);

  useEffect(() => {
    getAutoWhatsApp().then(setAutoWhatsAppOn).catch(() => {});
  }, []);

  // #2: Prefill discount from clinic settings
  useEffect(() => {
    if (clinic && clinic.discountEnabled && (clinic.discountPercent ?? 0) > 0) {
      setDiscountEnabled(true);
      setDiscountPercent(String(clinic.discountPercent ?? 0));
    }
  }, [clinic]);

  useEffect(() => {
    if (preselectedPatientId && !patient) {
      const p = patients.find((x) => x.id === preselectedPatientId);
      if (p) setPatient(p);
    }
  }, [preselectedPatientId, patients, patient]);

  const medicinesAmount = useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const treatmentsAmount = useMemo(() => treatments.reduce((s, t) => s + t.price, 0), [treatments]);
  const subtotal = medicinesAmount + treatmentsAmount + (parseFloat(consultationFee) || 0);
  const discountPct = parseFloat(discountPercent) || 0;
  const discountAmount = discountEnabled && discountPct > 0 ? Math.round((subtotal * discountPct) / 100) : 0;
  const total = subtotal - discountAmount;

  const updateItem = (key: string, patch: Partial<VisitItem>) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        const next = { ...it, ...patch };
        // Auto-compute qty when dosage/days change (tablets & capsules pattern)
        if ((patch.dosage !== undefined || patch.days !== undefined) && next.dosage && next.days > 0) {
          const perDay = dosesPerDay(next.dosage);
          if (perDay > 0) next.qty = Math.ceil(perDay * next.days);
        }
        return next;
      })
    );

  // #3: Add "Other" medicine manually
  const addOtherMedicine = () => {
    if (!otherMedicineName.trim()) return Alert.alert("Enter medicine name");
    const price = parseFloat(otherMedicinePrice) || 0;
    setItems((prev) => [
      ...prev,
      {
        key: `__other__${Date.now()}`,
        medicineId: `__other__${Date.now()}`,
        medicineName: otherMedicineName.trim(),
        qty: 0,
        dosage: "",
        timing: "",
        days: 0,
        price,
      },
    ]);
    setOtherMedicineName("");
    setOtherMedicinePrice("");
    setShowOtherForm(false);
    setMedicinePickerOpen(false);
  };

  // #13: Add treatment from picker or create new
  const addTreatment = (t: Treatment) => {
    setTreatments((prev) => [
      ...prev,
      {
        key: `${t.id}_${Date.now()}`,
        treatmentId: t.id,
        treatmentName: t.name,
        price: t.defaultPrice,
      },
    ]);
    setTreatmentPickerOpen(false);
  };

  const createAndAddTreatment = async () => {
    if (!accountId || !clinicId) return;
    if (!newTreatmentName.trim()) return Alert.alert("Enter treatment name");
    const price = parseFloat(newTreatmentPrice) || 0;
    try {
      const ref = await addDoc(treatmentsCol(accountId), {
        clinicId,
        name: newTreatmentName.trim(),
        defaultPrice: price,
        active: true,
        createdAt: serverTimestamp(),
      });
      setTreatments((prev) => [
        ...prev,
        {
          key: `${ref.id}_${Date.now()}`,
          treatmentId: ref.id,
          treatmentName: newTreatmentName.trim(),
          price,
        },
      ]);
      setNewTreatmentName("");
      setNewTreatmentPrice("");
      setShowNewTreatmentForm(false);
      setTreatmentPickerOpen(false);
    } catch (e) {
      Alert.alert("Could not create treatment", (e as Error).message);
    }
  };

  const save = async (allowInsufficient = false) => {
    if (!accountId || !clinicId || !user) return;
    if (items.length === 0 && treatments.length === 0) return Alert.alert("Add at least one medicine or treatment");
    for (const it of items) {
      if (!(it.qty > 0)) return Alert.alert("Check quantities", `${it.medicineName} has no quantity.`);
    }
    setBusy(true);
    try {
      const visitId = await saveVisit({
        accountId,
        clinicId,
        patientId: patient ? patient.id : "",
        patientName: patient ? patient.name : "Walk-in OTC Customer",
        diagnosis,
        items: items.map(({ key, ...it }) => it),
        consultationFee: parseFloat(consultationFee) || 0,
        paymentMode,
        byUid: user.uid,
        allowInsufficient,
        // #13: treatments
        treatments: treatments.map(({ key, ...t }) => t),
        treatmentsAmount,
        // #2: discount
        discountPercent: discountEnabled ? discountPct : 0,
        discountAmount,
      });
      const qs =
        autoWhatsApp && patient?.phone && isValidIndianPhone(patient.phone) ? "?fresh=1&autoWhatsApp=1" : "?fresh=1";
      router.replace(`/(app)/patients/visit/${visitId}${qs}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith("INSUFFICIENT_STOCK:")) {
        const [, name, have] = msg.split(":");
        Alert.alert(
          "Not enough stock",
          `Only ${have} of ${name} in stock at this clinic. Prescribe anyway? Stock will go negative.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Prescribe anyway", style: "destructive", onPress: () => save(true) },
          ]
        );
      } else {
        Alert.alert("Could not save", msg);
      }
      setBusy(false);
    }
  };

  const isStaff = member?.role === "staff";
  const hasValidPhone = !!patient?.phone && isValidIndianPhone(patient.phone);

  return (
    <PermissionGate permission="sales">
    <Screen>
      <Stack.Screen options={{ title: isStaff ? "Sell Medicine / Billing" : "New prescription" }} />
      <ClinicContextBadge />

      {/* Patient — #17: Walk-in OTC as top option */}
      <PickerRow
        icon="person-outline"
        label="Customer / Patient"
        value={patient ? patient.name : "Walk-in OTC Customer"}
        subtitle={patient ? [patient.age ? `${patient.age} yrs` : "", patient.phone].filter(Boolean).join(" · ") : "Tap to select a registered patient"}
        placeholder="Choose customer or patient"
        onPress={() => setPatientPickerOpen(true)}
      />

      <Input label="Diagnosis / complaint" value={diagnosis} onChangeText={setDiagnosis} />

      {/* Medicines */}
      <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
        <Text variant="caption">Medicines</Text>
        <Text variant="caption" color={colors.danger}>
          {items.length === 0 && treatments.length === 0 ? " *" : ""}
        </Text>
      </View>
      {items.map((it, idx) => {
        const isOther = it.medicineId.startsWith("__other__");
        const available = isOther ? Infinity : (stockByMedicine.get(it.medicineId) ?? 0);
        const short = !isOther && it.qty > available;
        return (
          <Card key={it.key} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="caption" color={colors.accent} style={{ fontWeight: "700" }}>
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Text variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {it.medicineName}
                  </Text>
                  {isOther && <Badge text="Unlisted" tone="warning" />}
                </View>
                <Text variant="caption" color={short ? colors.danger : colors.textSecondary}>
                  {isOther ? "No stock tracking" : `${available} in stock`}
                </Text>
              </View>
              <Pressable onPress={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Input
                label="Qty"
                value={it.qty ? String(it.qty) : ""}
                onChangeText={(v) => updateItem(it.key, { qty: parseInt(v, 10) || 0 })}
                keyboardType="number-pad"
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <Input
                label="Price/unit ₹"
                value={it.price ? String(it.price) : ""}
                onChangeText={(v) => updateItem(it.key, { price: parseFloat(v) || 0 })}
                keyboardType="decimal-pad"
                containerStyle={{ flex: 1.2, marginBottom: 0 }}
              />
            </View>
          </Card>
        );
      })}
      <View style={{ marginBottom: spacing.xl }}>
        <AddItemButton title="Add medicine" onPress={() => setMedicinePickerOpen(true)} />
      </View>

      {/* #13: Treatments section */}
      <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
        <Text variant="caption">Treatments</Text>
      </View>
      {treatments.map((t, idx) => (
        <Card key={t.key} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <Ionicons name="fitness-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                {t.treatmentName}
              </Text>
            </View>
            <Pressable onPress={() => setTreatments((prev) => prev.filter((x) => x.key !== t.key))} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <Input
            label="Price ₹"
            value={t.price ? String(t.price) : ""}
            onChangeText={(v) =>
              setTreatments((prev) =>
                prev.map((x) => (x.key === t.key ? { ...x, price: parseFloat(v) || 0 } : x))
              )
            }
            keyboardType="decimal-pad"
            containerStyle={{ marginBottom: 0 }}
          />
        </Card>
      ))}
      <View style={{ marginBottom: spacing.xl }}>
        <AddItemButton title="Add treatment" onPress={() => setTreatmentPickerOpen(true)} />
      </View>

      {/* Billing — #2: discount support */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Input
          label="Consultation fee (₹)"
          value={consultationFee}
          onChangeText={setConsultationFee}
          keyboardType="decimal-pad"
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
          <Text variant="secondary">Medicines</Text>
          <Text variant="body">{formatMoney(medicinesAmount)}</Text>
        </View>
        {treatmentsAmount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <Text variant="secondary">Treatments</Text>
            <Text variant="body">{formatMoney(treatmentsAmount)}</Text>
          </View>
        )}

        {/* #2: Discount row */}
        {clinic?.discountEnabled && (
          <View style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text variant="secondary">Discount</Text>
                <Switch
                  value={discountEnabled}
                  onValueChange={setDiscountEnabled}
                  trackColor={{ false: colors.border, true: colors.accentSoft }}
                  thumbColor={discountEnabled ? colors.cta : colors.surface}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              {discountEnabled && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Input
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    keyboardType="decimal-pad"
                    containerStyle={{ width: 60, marginBottom: 0 }}
                  />
                  <Text variant="caption">%</Text>
                </View>
              )}
            </View>
            {discountEnabled && discountAmount > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color={colors.accent}>Discount ({discountPct}%)</Text>
                <Text variant="body" color={colors.accent}>-{formatMoney(discountAmount)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md }}>
          <Text variant="body" style={{ fontWeight: "600" }}>
            Total
          </Text>
          <Text variant="subheading">{formatMoney(total)}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {PAYMENT_MODES.map((m) => (
            <SelectChip key={m.key} icon={m.icon} label={m.key} selected={paymentMode === m.key} onPress={() => setPaymentMode(m.key)} />
          ))}
        </View>
      </Card>

      {/* #19: WhatsApp — dimmed when phone unavailable */}
      <Card
        style={{
          marginBottom: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          opacity: hasValidPhone ? 1 : 0.4,
        }}
      >
        <View style={{ flex: 1 }} pointerEvents={hasValidPhone ? "auto" : "none"}>
          <Text variant="body" style={{ fontWeight: "600" }}>
            Auto send to WhatsApp
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {hasValidPhone
              ? `Send A4 PDF to ${patient!.phone} after saving`
              : "Select a patient with a valid phone number"}
          </Text>
        </View>
        <Switch
          value={autoWhatsApp && hasValidPhone}
          onValueChange={(v) => {
            setAutoWhatsAppOn(v);
            setAutoWhatsApp(v).catch(() => {});
          }}
          disabled={!hasValidPhone}
          trackColor={{ false: colors.border, true: colors.accentSoft }}
          thumbColor={(autoWhatsApp && hasValidPhone) ? colors.cta : colors.surface}
        />
      </Card>

      <Button title="Save & continue to print" onPress={() => save(false)} loading={busy} />

      {/* Pickers */}
      {/* #17: Walk-in OTC Customer as top option in patient picker */}
      <PickerModal
        visible={patientPickerOpen}
        title="Choose patient"
        items={[
          { id: "__walkin__", title: "Walk-in OTC Customer", subtitle: "No patient record" },
          ...patients.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: [p.age ? `${p.age} yrs` : "", p.phone].filter(Boolean).join(" · "),
          })),
        ]}
        onSelect={(item) => {
          if (item.id === "__walkin__") {
            setPatient(null);
          } else {
            setPatient(patients.find((p) => p.id === item.id) ?? null);
          }
          setPatientPickerOpen(false);
        }}
        onClose={() => setPatientPickerOpen(false)}
        onCreateNew={() => {
          setPatientPickerOpen(false);
          router.push("/(app)/patients/new");
        }}
        createLabel="Register new patient"
      />

      {/* Medicine picker — #3: "Other (unlisted)" option */}
      <PickerModal
        visible={medicinePickerOpen}
        title="Add medicine"
        items={[
          ...medicines.map((m) => ({
            id: m.id,
            title: m.name,
            subtitle: `${stockByMedicine.get(m.id) ?? 0} in stock${m.genericName ? ` · ${m.genericName}` : ""}`,
          })),
          { id: "__other__", title: "Other (unlisted medicine)", subtitle: "Enter name and price manually" },
        ]}
        onSelect={(item) => {
          if (item.id === "__other__") {
            setShowOtherForm(true);
            return; // Don't close the picker — show inline form
          }
          const m = medicines.find((x) => x.id === item.id);
          if (!m) return;
          setItems((prev) => [
            ...prev,
            {
              key: `${m.id}_${Date.now()}`,
              medicineId: m.id,
              medicineName: m.name,
              qty: 0,
              dosage: "",
              timing: "",
              days: 0,
              price: m.defaultPrice || 0,
            },
          ]);
          setMedicinePickerOpen(false);
        }}
        onClose={() => {
          setMedicinePickerOpen(false);
          setShowOtherForm(false);
        }}
        onCreateNew={() => {
          setMedicinePickerOpen(false);
          router.push("/(app)/stock/new-medicine");
        }}
        createLabel="Create new medicine"
        footer={
          showOtherForm ? (
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="label">Add unlisted medicine</Text>
              <Input
                label="Medicine name"
                value={otherMedicineName}
                onChangeText={setOtherMedicineName}
                autoFocus
              />
              <Input
                label="Price per unit (₹)"
                value={otherMedicinePrice}
                onChangeText={setOtherMedicinePrice}
                keyboardType="decimal-pad"
              />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setShowOtherForm(false);
                    setOtherMedicineName("");
                    setOtherMedicinePrice("");
                  }}
                  style={{ flex: 1 }}
                  compact
                />
                <Button title="Add" onPress={addOtherMedicine} style={{ flex: 1 }} compact />
              </View>
            </View>
          ) : undefined
        }
      />

      {/* #13: Treatment picker */}
      <PickerModal
        visible={treatmentPickerOpen}
        title="Add treatment"
        items={availableTreatments.map((t) => ({
          id: t.id,
          title: t.name,
          subtitle: `Default: ${formatMoney(t.defaultPrice)}`,
        }))}
        onSelect={(item) => {
          const t = availableTreatments.find((x) => x.id === item.id);
          if (t) addTreatment(t);
        }}
        onClose={() => {
          setTreatmentPickerOpen(false);
          setShowNewTreatmentForm(false);
        }}
        onCreateNew={() => setShowNewTreatmentForm(true)}
        createLabel="Create new treatment"
        footer={
          showNewTreatmentForm ? (
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="label">Create treatment</Text>
              <Input
                label="Treatment name"
                value={newTreatmentName}
                onChangeText={setNewTreatmentName}
                autoFocus
                placeholder="e.g. Head massage, Cupping"
              />
              <Input
                label="Default price (₹)"
                value={newTreatmentPrice}
                onChangeText={setNewTreatmentPrice}
                keyboardType="decimal-pad"
              />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setShowNewTreatmentForm(false);
                    setNewTreatmentName("");
                    setNewTreatmentPrice("");
                  }}
                  style={{ flex: 1 }}
                  compact
                />
                <Button title="Create & add" onPress={createAndAddTreatment} style={{ flex: 1 }} compact />
              </View>
            </View>
          ) : undefined
        }
      />
    </Screen>
    </PermissionGate>
  );
}
