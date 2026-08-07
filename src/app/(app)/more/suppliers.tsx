import React, { useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, serverTimestamp, updateDoc, query, where } from "firebase/firestore";
import { Avatar, Button, Card, EmptyState, Input, ListRow, LoadingState, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { useCollection } from "../../../hooks/useFirestore";
import { suppliersCol, supplierDoc } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../../theme/tokens";
import { Supplier } from "../../../types/models";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../../utils/phone";

type SupplierField = "company" | "phone" | "_form";

export default function Suppliers() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const canManage = useCanManage();

  const { data: suppliers, loading } = useCollection<Supplier>(
    () =>
      accountId && clinicId
        ? query(suppliersCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );

  const [adding, setAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [repName, setRepName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors<SupplierField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!accountId || !clinicId) return;
    const next: FieldErrors<SupplierField> = {};
    if (!repName.trim() && !company.trim()) next.company = "Enter the rep or company name.";
    const phoneErr = indianPhoneErrorOptional(phone);
    if (phoneErr) next.phone = phoneErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await addDoc(suppliersCol(accountId), {
        clinicId,
        repName: repName.trim(),
        company: company.trim(),
        phone: phone.trim() ? storageIndianPhone(phone) : "",
        notes: notes.trim(),
        active: true,
        createdAt: serverTimestamp(),
      });
      setRepName("");
      setCompany("");
      setPhone("");
      setNotes("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!accountId || !editingSupplier) return;
    const next: FieldErrors<SupplierField> = {};
    if (!repName.trim() && !company.trim()) next.company = "Enter the rep or company name.";
    const phoneErr = indianPhoneErrorOptional(phone);
    if (phoneErr) next.phone = phoneErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await updateDoc(supplierDoc(accountId, editingSupplier.id), {
        repName: repName.trim(),
        company: company.trim(),
        phone: phone.trim() ? storageIndianPhone(phone) : "",
        notes: notes.trim(),
      });
      setRepName("");
      setCompany("");
      setPhone("");
      setNotes("");
      setEditingSupplier(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = (s: Supplier) => {
    if (!accountId) return;
    Alert.alert("Remove supplier?", `${s.company || s.repName} will be hidden. Past purchases are kept.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => updateDoc(supplierDoc(accountId, s.id), { active: false }) },
    ]);
  };

  const addForm = (adding || editingSupplier) ? (
    <Card style={{ marginBottom: spacing.md }}>
      <Text variant="subheading" style={{ marginBottom: spacing.md }}>
        {editingSupplier ? "Edit supplier" : "New supplier"}
      </Text>
      <Input
        label="Company"
        required
        value={company}
        onChangeText={(v) => {
          setCompany(v);
          setErrors((e) => withoutField(e, "company"));
        }}
        autoFocus
        error={errors.company}
      />
      <Input label="Rep name" value={repName} onChangeText={setRepName} />
      <Input
        label="Phone"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          setErrors((e) => withoutField(e, "phone"));
        }}
        keyboardType="phone-pad"
        error={errors.phone ?? errors._form}
      />
      <Input label="Notes (visit day, terms...)" value={notes} onChangeText={setNotes} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => {
            setAdding(false);
            setEditingSupplier(null);
            setCompany("");
            setRepName("");
            setPhone("");
            setNotes("");
            setErrors(EMPTY_FIELD_ERRORS);
          }}
          style={{ flex: 1 }}
        />
        <Button title="Save" onPress={editingSupplier ? saveEdit : add} loading={busy} style={{ flex: 1 }} />
      </View>
    </Card>
  ) : (
    <Button
      title="Add supplier"
      variant="secondary"
      onPress={() => {
        setAdding(true);
        setEditingSupplier(null);
      }}
      style={{ marginBottom: spacing.md }}
    />
  );

  return (
    <PermissionGate permission="supplierManagement">
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarClearance }}
          data={[...suppliers].sort((a, b) => (a.company || a.repName).localeCompare(b.company || b.repName))}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          ListHeaderComponent={addForm}
          renderItem={({ item }) => (
            <ListRow
              left={<Avatar name={item.company || item.repName} />}
              title={item.company || item.repName}
              subtitle={[item.repName && item.company ? item.repName : "", item.notes].filter(Boolean).join(" · ")}
              right={
                <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "center" }}>
                  {canManage && (
                    <Pressable
                      onPress={() => {
                        setAdding(false);
                        setEditingSupplier(item);
                        setCompany(item.company ?? "");
                        setRepName(item.repName ?? "");
                        setPhone(item.phone ?? "");
                        setNotes(item.notes ?? "");
                        setErrors(EMPTY_FIELD_ERRORS);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.accent} />
                    </Pressable>
                  )}
                  {item.phone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${item.phone}`)} hitSlop={8}>
                      <Ionicons name="call-outline" size={20} color={colors.accent} />
                    </Pressable>
                  ) : null}
                  {canManage && (
                    <Pressable onPress={() => remove(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              }
            />
          )}
          ListEmptyComponent={
            loading ? (
              <LoadingState message="Loading suppliers…" />
            ) : (
              <EmptyState
                icon="business-outline"
                title="No suppliers yet"
                message="Add the reps and companies you buy medicines from. You can also add them on the fly while recording a purchase."
              />
            )
          }
        />
      </KeyboardAvoidingView>
    </PermissionGate>
  );
}
