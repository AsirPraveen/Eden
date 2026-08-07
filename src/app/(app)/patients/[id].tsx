import React, { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteDoc, orderBy, query, updateDoc, where } from "firebase/firestore";
import { Avatar, Button, Card, EmptyState, Input, ListRow, Screen, SelectChip, Text } from "../../../components/base";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCollection, useDoc } from "../../../hooks/useFirestore";
import { patientDoc, visitsCol } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Patient, Visit } from "../../../types/models";
import { formatDate, formatMoney } from "../../../utils/format";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../../utils/phone";

const SEXES = [
  { key: "male", icon: "man-outline" },
  { key: "female", icon: "woman-outline" },
  { key: "other", icon: "person-outline" },
] as const;

type PatientField = "name" | "phone" | "_form";

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { accountId, member } = useSession();
  const canManage = useCanManage();
  const perms = usePermissions();
  const canEdit = canManage || perms.patientManagement;

  const { data: patient } = useDoc<Patient>(
    () => (accountId && id ? patientDoc(accountId, id) : null),
    [accountId, id]
  );

  const [sortAsc, setSortAsc] = useState(false);
  const { data: visits } = useCollection<Visit>(
    () =>
      accountId && id
        ? query(visitsCol(accountId), where("patientId", "==", id), orderBy("date", sortAsc ? "asc" : "desc"))
        : null,
    [accountId, id, sortAsc]
  );

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<(typeof SEXES)[number]["key"] | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors<PatientField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setName(patient.name);
    setAge(patient.age != null ? String(patient.age) : "");
    setSex(patient.sex);
    setPhone(patient.phone ?? "");
    setAddress(patient.address ?? "");
    setNotes(patient.notes ?? "");
  }, [patient]);

  const save = async () => {
    if (!accountId || !patient) return;
    const next: FieldErrors<PatientField> = {};
    if (!name.trim()) next.name = "Enter the patient's name.";
    const phoneErr = indianPhoneErrorOptional(phone);
    if (phoneErr) next.phone = phoneErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await updateDoc(patientDoc(accountId, patient.id), {
        name: name.trim(),
        age: parseInt(age, 10) || null,
        sex,
        phone: storageIndianPhone(phone),
        address: address.trim(),
        notes: notes.trim(),
      });
      setEditing(false);
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const removePatient = () => {
    if (!accountId || !patient) return;
    Alert.alert(
      "Remove patient?",
      `${patient.name} and their profile will be deleted. Visit records are kept for your records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(patientDoc(accountId, patient.id));
              router.back();
            } catch (e) {
              Alert.alert("Could not remove", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  if (!patient) return <Screen scroll={false}><View /></Screen>;

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Edit patient" }} />
        <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
          <Avatar name={name || "?"} size={64} />
        </View>
        <Input
          label="Name"
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => withoutField(e, "name"));
          }}
          autoFocus
          error={errors.name}
        />
        <Input
          label="Phone"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setErrors((e) => withoutField(e, "phone"));
          }}
          keyboardType="phone-pad"
          error={errors.phone}
        />
        <Input
          label="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          containerStyle={{ maxWidth: 140 }}
        />
        <View style={{ marginBottom: spacing.lg }}>
          <Text variant="caption" style={{ marginBottom: spacing.xs }}>
            Sex
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {SEXES.map((s) => (
              <SelectChip
                key={s.key}
                icon={s.icon}
                label={s.key}
                selected={sex === s.key}
                onPress={() => setSex(sex === s.key ? null : s.key)}
                expand
                compact
              />
            ))}
          </View>
        </View>
        <Input label="Address" value={address} onChangeText={setAddress} />
        <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Allergies, conditions..." />
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
          <Button title="Save" onPress={save} loading={busy} style={{ flex: 1 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: patient.name }} />
      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
          <Avatar name={patient.name} size={56} />
          <View style={{ flex: 1 }}>
            <Text variant="subheading">{patient.name}</Text>
            <Text variant="caption" style={{ marginTop: 2 }}>
              {[patient.age ? `${patient.age} yrs` : "", patient.sex ?? "", patient.phone].filter(Boolean).join(" · ")}
            </Text>
            {patient.address ? (
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                {patient.address}
              </Text>
            ) : null}
          </View>
        </View>
        {patient.notes ? (
          <Text variant="secondary" style={{ marginBottom: spacing.md }}>
            {patient.notes}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {member?.role !== "staff" && (
            <Button
              title="New prescription"
              compact
              onPress={() => router.push({ pathname: "/(app)/patients/prescribe", params: { patientId: patient.id } })}
            />
          )}
          {canEdit && (
            <Button title="Edit" compact variant="secondary" onPress={() => setEditing(true)} />
          )}
        </View>
      </Card>

      <Card style={{ padding: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm,
          }}
        >
          <Text variant="label">Visit history</Text>
          <Pressable
            onPress={() => setSortAsc((v) => !v)}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name={sortAsc ? "arrow-up" : "arrow-down"} size={16} color={colors.accent} />
            <Text variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>
              {sortAsc ? "Oldest first" : "Newest first"}
            </Text>
          </Pressable>
        </View>
        {visits.length === 0 ? (
          <EmptyState title="No visits yet" />
        ) : (
          visits.map((v) => (
            <ListRow
              key={v.id}
              title={formatDate(v.date.toDate())}
              subtitle={v.diagnosis || `${v.items.length} medicine${v.items.length === 1 ? "" : "s"}`}
              right={formatMoney(v.totalAmount)}
              onPress={() => router.push(`/(app)/patients/visit/${v.id}`)}
            />
          ))
        )}
      </Card>

      {canManage && (
        <Button title="Remove patient" variant="ghost" onPress={removePatient} style={{ marginTop: spacing.xl }} />
      )}
    </Screen>
  );
}
