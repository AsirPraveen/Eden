import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { Avatar, Button, Card, IconCircle, ListRow, Screen, Text } from "../../../../components/base";
import { useDoc } from "../../../../hooks/useFirestore";
import { clinicDoc, patientDoc, visitDoc } from "../../../../services/paths";
import {
  generateVisitPdfA4,
  isBluetoothAvailable,
  printVisitThermal,
  shareVisitPdfA4,
  shareVisitPdfThermal,
} from "../../../../services/printing/printer";
import { sharePrescriptionWhatsApp } from "../../../../services/whatsapp";
import { useSession } from "../../../../stores/useSession";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../theme/tokens";
import { Clinic, Patient, Visit } from "../../../../types/models";
import { formatDateTime, formatMoney } from "../../../../utils/format";
import { isValidIndianPhone } from "../../../../utils/phone";

export default function VisitDetail() {
  const { colors } = useTheme();
  const { id, fresh, autoWhatsApp } = useLocalSearchParams<{
    id: string;
    fresh?: string;
    autoWhatsApp?: string;
  }>();
  const { accountId, member } = useSession();
  const [printing, setPrinting] = useState(false);
  const [sharingA4, setSharingA4] = useState(false);
  const [sharingThermal, setSharingThermal] = useState(false);
  const autoWhatsAppSent = useRef(false);

  const { data: visit } = useDoc<Visit>(
    () => (accountId && id ? visitDoc(accountId, id) : null),
    [accountId, id]
  );
  const { data: clinic } = useDoc<Clinic>(
    () => (accountId && visit ? clinicDoc(accountId, visit.clinicId) : null),
    [accountId, visit?.clinicId]
  );
  const { data: patient } = useDoc<Patient>(
    () => (accountId && visit?.patientId ? patientDoc(accountId, visit.patientId) : null),
    [accountId, visit?.patientId]
  );

  const markPrinted = () => {
    if (!accountId || !visit) return;
    updateDoc(visitDoc(accountId, visit.id), { printedAt: serverTimestamp() }).catch(() => { });
  };

  useEffect(() => {
    if (autoWhatsAppSent.current || fresh !== "1" || autoWhatsApp !== "1" || !visit || !clinic) return;
    const phone = patient?.phone ?? "";
    if (!isValidIndianPhone(phone)) return;

    autoWhatsAppSent.current = true;
    (async () => {
      try {
        const pdf = await generateVisitPdfA4(visit, clinic, patient, { accountId, member });
        await sharePrescriptionWhatsApp(phone, pdf.uri, pdf.filename);
        markPrinted();
      } catch {
        // Silent - doctor can share manually from the buttons below.
      }
    })();
  }, [fresh, autoWhatsApp, visit, clinic, patient]);

  if (!visit) return <Screen scroll={false}><View /></Screen>;

  const printThermal = async () => {
    if (!clinic) return;
    setPrinting(true);
    try {
      await printVisitThermal(visit, clinic);
      markPrinted();
    } catch (e) {
      Alert.alert("Print failed", (e as Error).message);
    } finally {
      setPrinting(false);
    }
  };

  const shareA4 = async () => {
    if (!clinic) return;
    setSharingA4(true);
    try {
      await shareVisitPdfA4(visit, clinic, patient, { accountId, member });
      markPrinted();
    } catch (e) {
      Alert.alert("Could not create PDF", (e as Error).message);
    } finally {
      setSharingA4(false);
    }
  };

  const shareThermal = async () => {
    if (!clinic) return;
    setSharingThermal(true);
    try {
      await shareVisitPdfThermal(visit, clinic, patient, { accountId, member });
      markPrinted();
    } catch (e) {
      Alert.alert("Could not create PDF", (e as Error).message);
    } finally {
      setSharingThermal(false);
    }
  };

  const shareWhatsApp = async () => {
    if (!clinic) return;
    const phone = patient?.phone ?? "";
    if (!isValidIndianPhone(phone)) {
      Alert.alert("No valid phone number", "Add a 10-digit mobile number to the patient profile to send via WhatsApp.");
      return;
    }
    setSharingA4(true);
    try {
      const pdf = await generateVisitPdfA4(visit, clinic, patient, { accountId, member });
      await sharePrescriptionWhatsApp(phone, pdf.uri, pdf.filename);
      markPrinted();
    } catch (e) {
      Alert.alert("Could not send", (e as Error).message);
    } finally {
      setSharingA4(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: visit.patientName }} />

      {fresh === "1" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: colors.accentSoft,
            borderRadius: 14,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
          <Text variant="caption" color={colors.accent} style={{ fontWeight: "600", flex: 1 }}>
            Prescription saved - stock updated
            {autoWhatsApp === "1" && patient?.phone && isValidIndianPhone(patient.phone)
              ? " · Opening WhatsApp"
              : ""}
          </Text>
        </View>
      )}

      <Card style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Avatar name={visit.patientName} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{visit.patientName}</Text>
          <Text variant="caption" style={{ marginTop: 2 }}>
            {formatDateTime(visit.date.toDate())}
            {visit.diagnosis ? ` · ${visit.diagnosis}` : ""}
          </Text>
          {patient?.phone ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {patient.phone}
            </Text>
          ) : null}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md, padding: 0 }}>
        <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
          ℞ Prescription
        </Text>
        {visit.items.map((it, i) => (
          <ListRow
            key={i}
            left={<IconCircle name="medical-outline" tone="accent" size={34} />}
            title={it.medicineName}
            subtitle={[it.dosage, it.timing, it.days ? `${it.days} days` : ""].filter(Boolean).join(" · ")}
            right={formatMoney(it.qty * it.price)}
            rightSub={`${it.qty} × ${formatMoney(it.price)}`}
          />
        ))}
      </Card>

      <View style={{ backgroundColor: colors.accent, borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md }}>
        {visit.consultationFee > 0 && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
              <Text variant="body" color="rgba(245,242,233,0.8)">
                Medicines
              </Text>
              <Text variant="body" color="#F5F2E9">
                {formatMoney(visit.medicinesAmount)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
              <Text variant="body" color="rgba(245,242,233,0.8)">
                Consultation
              </Text>
              <Text variant="body" color="#F5F2E9">
                {formatMoney(visit.consultationFee)}
              </Text>
            </View>
          </>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text variant="caption" color="rgba(245,242,233,0.8)" style={{ fontWeight: "600" }}>
            Total · {visit.paymentMode.toUpperCase()}
          </Text>
          <Text variant="title" color="#F5F2E9">
            {formatMoney(visit.totalAmount)}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        {isBluetoothAvailable() && (
          <Button title={visit.printedAt ? "Reprint thermal" : "Print thermal"} onPress={printThermal} loading={printing} />
        )}
        <Button title="Share A4 prescription (PDF)" variant="primary" onPress={shareA4} loading={sharingA4} />
        <Button title="Share thermal receipt (70mm PDF)" variant="secondary" onPress={shareThermal} loading={sharingThermal} />
        <Button
          title="Send to WhatsApp"
          variant="secondary"
          onPress={shareWhatsApp}
          loading={sharingA4}
          disabled={!patient?.phone || !isValidIndianPhone(patient.phone)}
        />
      </View>
      {visit.printedAt && (
        <Text variant="caption" style={{ marginTop: spacing.md, textAlign: "center" }}>
          Printed {formatDateTime(visit.printedAt.toDate())}
        </Text>
      )}
    </Screen>
  );
}
