import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { orderBy, query, where } from "firebase/firestore";
import { Badge, Button, Card, SelectChip, Screen, Input, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { AddItemButton, PickerRow } from "../../../components/PickerRow";
import { PickerModal } from "../../../components/PickerModal";
import { useCollection } from "../../../hooks/useFirestore";
import { medicinesCol, patientsCol, stockCol } from "../../../services/paths";
import { saveVisit } from "../../../services/visits";
import { getAutoWhatsApp, setAutoWhatsApp } from "../../../services/preferences";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Medicine, Patient, StockDoc, Visit, VisitItem } from "../../../types/models";
import { formatMoney } from "../../../utils/format";
import { isValidIndianPhone } from "../../../utils/phone";

type DraftItem = VisitItem & { key: string };

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

  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [consultationFee, setConsultationFee] = useState("");
  const [paymentMode, setPaymentMode] = useState<Visit["paymentMode"]>("cash");
  const [busy, setBusy] = useState(false);
  const [autoWhatsApp, setAutoWhatsAppOn] = useState(false);

  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [medicinePickerOpen, setMedicinePickerOpen] = useState(false);

  useEffect(() => {
    getAutoWhatsApp().then(setAutoWhatsAppOn).catch(() => {});
  }, []);

  useEffect(() => {
    if (preselectedPatientId && !patient) {
      const p = patients.find((x) => x.id === preselectedPatientId);
      if (p) setPatient(p);
    }
  }, [preselectedPatientId, patients, patient]);

  const medicinesAmount = useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const total = medicinesAmount + (parseFloat(consultationFee) || 0);

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

  const save = async (allowInsufficient = false) => {
    if (!accountId || !clinicId || !user) return;
    if (items.length === 0) return Alert.alert("Add at least one medicine");
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

  return (
    <PermissionGate permission="sales">
    <Screen>
      <Stack.Screen options={{ title: isStaff ? "Sell Medicine / Billing" : "New prescription" }} />
      {/* Patient */}
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
          {" *"}
        </Text>
      </View>
      {items.map((it, idx) => {
        const available = stockByMedicine.get(it.medicineId) ?? 0;
        const short = it.qty > available;
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
                <Text variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {it.medicineName}
                </Text>
                <Text variant="caption" color={short ? colors.danger : colors.textSecondary}>
                  {available} in stock
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

      {/* Billing */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Input
          label="Consultation fee (₹)"
          value={consultationFee}
          onChangeText={setConsultationFee}
          keyboardType="decimal-pad"
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md }}>
          <Text variant="secondary">Medicines</Text>
          <Text variant="body">{formatMoney(medicinesAmount)}</Text>
        </View>
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

      <Card style={{ marginBottom: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: "600" }}>
            Auto send to WhatsApp
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {patient?.phone && isValidIndianPhone(patient.phone)
              ? `Send A4 PDF to ${patient.phone} after saving`
              : "Select a patient with a valid phone number"}
          </Text>
        </View>
        <Switch
          value={autoWhatsApp && !!patient?.phone && isValidIndianPhone(patient.phone)}
          onValueChange={(v) => {
            setAutoWhatsAppOn(v);
            setAutoWhatsApp(v).catch(() => {});
          }}
          disabled={!patient?.phone || !isValidIndianPhone(patient.phone)}
          trackColor={{ false: colors.border, true: colors.accentSoft }}
          thumbColor={(autoWhatsApp && !!patient?.phone && isValidIndianPhone(patient.phone)) ? colors.cta : colors.surface}
        />
      </Card>

      <Button title="Save & continue to print" onPress={() => save(false)} loading={busy} />

      {/* Pickers */}
      <PickerModal
        visible={patientPickerOpen}
        title="Choose patient"
        items={patients.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: [p.age ? `${p.age} yrs` : "", p.phone].filter(Boolean).join(" · "),
        }))}
        onSelect={(item) => {
          setPatient(patients.find((p) => p.id === item.id) ?? null);
          setPatientPickerOpen(false);
        }}
        onClose={() => setPatientPickerOpen(false)}
        onCreateNew={() => {
          setPatientPickerOpen(false);
          router.push("/(app)/patients/new");
        }}
        createLabel="Register new patient"
      />
      <PickerModal
        visible={medicinePickerOpen}
        title="Add medicine"
        items={medicines.map((m) => ({
          id: m.id,
          title: m.name,
          subtitle: `${stockByMedicine.get(m.id) ?? 0} in stock${m.genericName ? ` · ${m.genericName}` : ""}`,
        }))}
        onSelect={(item) => {
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
