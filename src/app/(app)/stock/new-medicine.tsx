import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Screen, SelectChip, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { medicinesCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { spacing } from "../../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { MedicineForm } from "../../../types/models";

const FORMS: MedicineForm[] = ["tablet", "capsule", "syrup", "injection", "drops", "ointment", "powder", "other"];
const UNIT_FOR: Record<MedicineForm, string> = {
  tablet: "tab",
  capsule: "cap",
  syrup: "bottle",
  injection: "vial",
  drops: "bottle",
  ointment: "tube",
  powder: "sachet",
  other: "unit",
};
const ICON_FOR: Record<MedicineForm, React.ComponentProps<typeof Ionicons>["name"]> = {
  tablet: "ellipse-outline",
  capsule: "medical-outline",
  syrup: "flask-outline",
  injection: "medkit-outline",
  drops: "water-outline",
  ointment: "color-fill-outline",
  powder: "cafe-outline",
  other: "cube-outline",
};

type MedicineField = "name" | "price" | "_form";

export default function NewMedicine() {
  const { accountId, clinicId } = useSession();
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [form, setForm] = useState<MedicineForm>("tablet");
  const [price, setPrice] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [errors, setErrors] = useState<FieldErrors<MedicineField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!accountId || !clinicId) return;
    const next: FieldErrors<MedicineField> = {};
    if (!name.trim()) next.name = "Enter the medicine name.";
    const priceNum = parseFloat(price);
    if (!(priceNum >= 0)) next.price = "Enter a valid selling price.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await addDoc(medicinesCol(accountId), {
        clinicId,
        name: name.trim(),
        genericName: genericName.trim(),
        form,
        unit: UNIT_FOR[form],
        defaultPrice: priceNum,
        lowStockThreshold: parseInt(threshold, 10) || 0,
        active: true,
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch (e) {
      setErrors({ _form: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <PermissionGate permission="addMedicine">
    <Screen>
      <Input
        label="Name"
        required
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErrors((e) => withoutField(e, "name"));
        }}
        placeholder="Paracetamol 500mg"
        autoFocus
        error={errors.name}
      />
      <Input label="Generic name" value={genericName} onChangeText={setGenericName} />
      <Text variant="caption" style={{ marginBottom: spacing.sm }}>
        Form
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {FORMS.map((f) => (
          <SelectChip key={f} icon={ICON_FOR[f]} label={f} selected={form === f} onPress={() => setForm(f)} />
        ))}
      </View>
      <Input
        label={`Selling price per ${UNIT_FOR[form]} (₹)`}
        required
        value={price}
        onChangeText={(v) => {
          setPrice(v);
          setErrors((e) => withoutField(e, "price"));
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        error={errors.price ?? errors._form}
      />
      <Input
        label="Low-stock alert level"
        value={threshold}
        onChangeText={setThreshold}
        keyboardType="number-pad"
      />
      <Button title="Save medicine" onPress={submit} loading={busy} />
    </Screen>
    </PermissionGate>
  );
}
