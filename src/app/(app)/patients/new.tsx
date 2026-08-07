import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { Avatar, Button, Input, Screen, SelectChip, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { patientsCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { spacing } from "../../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../../utils/phone";

const SEXES = [
  { key: "male", icon: "man-outline" },
  { key: "female", icon: "woman-outline" },
  { key: "other", icon: "person-outline" },
] as const;

type PatientField = "name" | "phone" | "_form";

export default function NewPatient() {
  const { accountId } = useSession();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<(typeof SEXES)[number]["key"] | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors<PatientField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!accountId) return;
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
      const ref = await addDoc(patientsCol(accountId), {
        name: name.trim(),
        age: parseInt(age, 10) || null,
        sex,
        phone: storageIndianPhone(phone),
        address: address.trim(),
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        lastVisitAt: null,
      });
      router.replace(`/(app)/patients/${ref.id}`);
    } catch (e) {
      setErrors({ _form: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <PermissionGate permission="patientManagement">
    <Screen>
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
      <Input label="Address" value={address} onChangeText={setAddress} />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Allergies, conditions..." />
      <Button title="Save patient" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </Screen>
    </PermissionGate>
  );
}
