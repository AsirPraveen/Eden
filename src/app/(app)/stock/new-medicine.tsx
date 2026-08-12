import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { addDoc, query, serverTimestamp, where, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Input, Screen, SelectChip, Text } from "../../../components/base";
import { ClinicContextBadge } from "../../../components/ClinicContextBadge";
import { PermissionGate } from "../../../components/PermissionGate";
import { useCollection, useDoc } from "../../../hooks/useFirestore";
import { clinicDoc, medicinesCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { Clinic, Medicine, MedicineForm } from "../../../types/models";
import { DEFAULT_FORMS, iconForForm, unitForForm } from "../../../utils/medicineConstants";

type MedicineField = "name" | "price" | "customForm" | "_form";

export default function NewMedicine() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [form, setForm] = useState<string>("tablet");
  const [customFormInput, setCustomFormInput] = useState("");
  const [price, setPrice] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [errors, setErrors] = useState<FieldErrors<MedicineField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);
  const [showEditCustomForms, setShowEditCustomForms] = useState(false);

  // Load clinic for custom form types
  const { data: clinic } = useDoc<Clinic>(
    () => (accountId && clinicId ? clinicDoc(accountId, clinicId) : null),
    [accountId, clinicId]
  );

  // Query existing medicines for name suggestions (awareness-only)
  const { data: existingMedicines } = useCollection<Medicine>(
    () =>
      accountId && clinicId
        ? query(medicinesCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );

  // Filter suggestions based on typed name (minimum 2 chars)
  const nameSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (q.length < 2) return [];
    return existingMedicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .map((m) => m.name)
      .slice(0, 5);
  }, [name, existingMedicines]);

  // Combine default forms and clinic custom forms
  const formsToDisplay = useMemo(() => {
    const defaults = DEFAULT_FORMS.filter((f) => f !== "other");
    const custom = clinic?.customForms || [];
    return [...defaults, ...custom, "other"];
  }, [clinic?.customForms]);

  const submit = async () => {
    if (!accountId || !clinicId) return;
    const next: FieldErrors<MedicineField> = {};
    if (!name.trim()) next.name = "Enter the medicine name.";
    const priceNum = parseFloat(price);
    if (!(priceNum >= 0)) next.price = "Enter a valid selling price.";
    if (form === "other" && !customFormInput.trim()) {
      next.customForm = "Enter custom form name.";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);

    try {
      const finalForm = form === "other" ? customFormInput.trim() : form;

      // If a new custom form was entered, persist it to clinic doc
      if (form === "other") {
        const nextCustom = [...(clinic?.customForms || [])];
        if (!nextCustom.map((c) => c.toLowerCase()).includes(finalForm.toLowerCase())) {
          nextCustom.push(finalForm);
          await updateDoc(clinicDoc(accountId, clinicId), { customForms: nextCustom });
        }
      }

      await addDoc(medicinesCol(accountId), {
        clinicId,
        name: name.trim(),
        genericName: genericName.trim(),
        form: finalForm as MedicineForm,
        unit: unitForForm(finalForm),
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
        <ClinicContextBadge label="Adding to" />

        <View style={{ position: "relative", zIndex: 10 }}>
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

          {/* Name suggestions — awareness-only, NOT selectable */}
          {nameSuggestions.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                zIndex: 100,
                marginTop: -spacing.sm,
              }}
              pointerEvents="none"
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: typography.weight.semibold,
                  marginBottom: spacing.xs,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
                color={colors.textMuted}
              >
                Existing medicines
              </Text>
              {nameSuggestions.map((s, i) => (
                <Text key={i} variant="body" color={colors.textSecondary} style={{ paddingVertical: 3 }}>
                  {s}
                </Text>
              ))}
            </View>
          )}
        </View>

        <Input label="Generic name" value={genericName} onChangeText={setGenericName} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text variant="caption">Form</Text>
          {(clinic?.customForms || []).length > 0 && (
            <Pressable onPress={() => setShowEditCustomForms(true)} hitSlop={8}>
              <Ionicons name="create-outline" size={14} color={colors.accent} />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
          {formsToDisplay.map((f) => (
            <SelectChip
              key={f}
              icon={iconForForm(f)}
              label={f}
              selected={form === f}
              onPress={() => {
                setForm(f);
                setErrors((e) => withoutField(e, "customForm"));
              }}
            />
          ))}
        </View>

        {form === "other" && (
          <Input
            label="Custom form name"
            required
            value={customFormInput}
            onChangeText={(v) => {
              setCustomFormInput(v);
              setErrors((e) => withoutField(e, "customForm"));
            }}
            placeholder="e.g. spray, gel, patch"
            error={errors.customForm}
          />
        )}

        <Input
          label={`Selling price per ${unitForForm(form === "other" ? customFormInput : form)} (₹)`}
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

        {/* Custom Forms Management Modal */}
        <Modal
          visible={showEditCustomForms}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEditCustomForms(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalCard}>
              <Text variant="subheading" style={{ marginBottom: spacing.md }}>
                Custom form types
              </Text>
              {(clinic?.customForms || []).map((cf) => (
                <View
                  key={cf}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text>{cf}</Text>
                  <Pressable
                    onPress={async () => {
                      const nextCustom = (clinic?.customForms || []).filter((c) => c !== cf);
                      await updateDoc(clinicDoc(accountId!, clinicId!), { customForms: nextCustom });
                      if (form === cf) setForm("tablet");
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setShowEditCustomForms(false)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </View>
        </Modal>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: spacing.lg,
  },
  modalCard: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
});
