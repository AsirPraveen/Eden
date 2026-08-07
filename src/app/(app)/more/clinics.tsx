import { addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Badge, Button, Card, IconCircle, Input, ListRow, Screen, Text } from "../../../components/base";
import { ColorPickerModal } from "../../../components/ColorPickerModal";
import { deleteCloudinaryImage, isCloudinaryConfigured, pickAndUploadImage, thumb } from "../../../services/cloudinary";
import { clinicDoc, clinicsCol } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { BRANDING_PRESETS } from "../../../theme/branding";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { Clinic } from "../../../types/models";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../../utils/phone";

type ClinicField = "name" | "phone" | "_form";

export default function Clinics() {
  const { colors } = useTheme();
  const { accountId, clinics, clinicId } = useSession();
  const canManage = useCanManage();

  const [editing, setEditing] = useState<Clinic | "new" | null>(null);
  const [viewing, setViewing] = useState<Clinic | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"primary" | "accent" | null>(null);
  const [errors, setErrors] = useState<FieldErrors<ClinicField>>(EMPTY_FIELD_ERRORS);

  const startEdit = (c: Clinic | "new") => {
    setEditing(c);
    setErrors(EMPTY_FIELD_ERRORS);
    if (c === "new") {
      setName("");
      setAddress("");
      setPhone("");
      setDoctorName("");
      setRegNo("");
      setLogoUrl(null);
      setPrimaryColor(null);
      setAccentColor(null);
    } else {
      setName(c.name);
      setAddress(c.address);
      setPhone(c.phone);
      setDoctorName(c.doctorName);
      setRegNo(c.regNo);
      setLogoUrl(c.logoUrl ?? null);
      setPrimaryColor(c.primaryColor ?? null);
      setAccentColor(c.accentColor ?? null);
    }
  };

  const save = async () => {
    if (!accountId || !editing) return;
    const next: FieldErrors<ClinicField> = {};
    if (!name.trim()) next.name = "Enter the clinic name.";
    const phoneErr = indianPhoneErrorOptional(phone);
    if (phoneErr) next.phone = phoneErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      const data = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() ? storageIndianPhone(phone) : "",
        doctorName: doctorName.trim(),
        regNo: regNo.trim(),
        logoUrl,
        primaryColor: primaryColor?.trim() || null,
        accentColor: accentColor?.trim() || null,
      };
      if (editing === "new") {
        await addDoc(clinicsCol(accountId), {
          ...data,
          printerConfig: null,
          active: true,
          createdAt: serverTimestamp(),
        });
      } else {
        const oldLogo = editing.logoUrl ?? null;
        if (oldLogo && logoUrl !== oldLogo) {
          deleteCloudinaryImage(oldLogo).catch(() => { });
        }
        await updateDoc(clinicDoc(accountId, editing.id), data);
      }
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  if (viewing) {
    const c = viewing;
    return (
      <Screen>
        <Text variant="subheading" style={{ marginBottom: spacing.lg }}>
          {c.name}
        </Text>
        {c.logoUrl ? (
          <Image source={{ uri: thumb(c.logoUrl, 160) }} style={{ width: 72, height: 72, borderRadius: 12, marginBottom: spacing.lg }} />
        ) : null}
        <Card style={{ marginBottom: spacing.lg, gap: spacing.md }}>
          {c.address ? (
            <View>
              <Text variant="caption" color={colors.textSecondary}>
                Address
              </Text>
              <Text variant="body">{c.address}</Text>
            </View>
          ) : null}
          {c.phone ? (
            <View>
              <Text variant="caption" color={colors.textSecondary}>
                Phone
              </Text>
              <Text variant="body">{c.phone}</Text>
            </View>
          ) : null}
          {c.doctorName ? (
            <View>
              <Text variant="caption" color={colors.textSecondary}>
                Doctor name
              </Text>
              <Text variant="body">{c.doctorName}</Text>
            </View>
          ) : null}
          {c.regNo ? (
            <View>
              <Text variant="caption" color={colors.textSecondary}>
                Medical registration no.
              </Text>
              <Text variant="body">{c.regNo}</Text>
            </View>
          ) : null}
          {(c.primaryColor || c.accentColor) && (
            <View>
              <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                Theme colors
              </Text>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                {c.primaryColor ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.primaryColor }} />
                    <Text variant="caption">{c.primaryColor}</Text>
                  </View>
                ) : null}
                {c.accentColor ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.accentColor }} />
                    <Text variant="caption">{c.accentColor}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </Card>
        <Button title="Back" variant="ghost" onPress={() => setViewing(null)} />
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen>
        <Text variant="subheading" style={{ marginBottom: spacing.lg }}>
          {editing === "new" ? "New clinic" : `Edit ${editing.name}`}
        </Text>
        <Input
          label="Clinic name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => withoutField(e, "name"));
          }}
          autoFocus={editing === "new"}
          error={errors.name}
        />
        <Input label="Address (printed on prescriptions)" value={address} onChangeText={setAddress} multiline />
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
        <Input label="Doctor name (printed)" value={doctorName} onChangeText={setDoctorName} />
        <Input label="Medical registration no." value={regNo} onChangeText={setRegNo} />

        <Text variant="caption" style={{ marginBottom: spacing.xs }}>
          Logo (shown in app header and on printed documents)
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
          {logoUrl ? (
            <Image source={{ uri: thumb(logoUrl, 160) }} style={{ width: 56, height: 56, borderRadius: 8 }} />
          ) : null}
          <Button
            title={logoUrl ? "Change logo" : "Upload logo"}
            variant="secondary"
            compact
            loading={uploading}
            onPress={async () => {
              if (!isCloudinaryConfigured) {
                Alert.alert(
                  "Cloudinary not set up",
                  "Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local - see docs/FIREBASE_SETUP.md."
                );
                return;
              }
              setUploading(true);
              try {
                const oldUrl = logoUrl;
                const url = await pickAndUploadImage("eden/logos", oldUrl);
                if (url) setLogoUrl(url);
              } catch (e) {
                Alert.alert("Upload failed", (e as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
          {logoUrl ? (
            <Button
              title="Remove"
              variant="ghost"
              compact
              onPress={() => {
                const old = logoUrl;
                setLogoUrl(null);
                deleteCloudinaryImage(old).catch(() => { });
              }}
            />
          ) : null}
        </View>

        <Text variant="caption" style={{ marginBottom: spacing.sm }}>
          Theme colors
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
          {BRANDING_PRESETS.map((preset) => {
            const selected = primaryColor === preset.primary && accentColor === preset.accent;
            return (
              <Pressable
                key={preset.label}
                onPress={() => {
                  setPrimaryColor(preset.primary);
                  setAccentColor(preset.accent);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentSoft : colors.surface,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.primary }} />
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.accent }} />
                  <Text variant="caption" style={{ fontWeight: selected ? "700" : "400" }}>
                    {preset.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
          <Pressable onPress={() => setPickerTarget("primary")} style={{ flex: 1 }}>
            <Text variant="caption" style={{ marginBottom: spacing.xs }}>
              Primary
            </Text>
            <View
              style={{
                height: 44,
                borderRadius: 12,
                backgroundColor: primaryColor ?? colors.border,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </Pressable>
          <Pressable onPress={() => setPickerTarget("accent")} style={{ flex: 1 }}>
            <Text variant="caption" style={{ marginBottom: spacing.xs }}>
              Accent
            </Text>
            <View
              style={{
                height: 44,
                borderRadius: 12,
                backgroundColor: accentColor ?? colors.border,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </Pressable>
        </View>

        <ColorPickerModal
          visible={pickerTarget === "primary"}
          title="Primary color"
          value={primaryColor}
          fallback={BRANDING_PRESETS[0].primary}
          onClose={() => setPickerTarget(null)}
          onSelect={setPrimaryColor}
        />
        <ColorPickerModal
          visible={pickerTarget === "accent"}
          title="Accent color"
          value={accentColor}
          fallback={BRANDING_PRESETS[0].accent}
          onClose={() => setPickerTarget(null)}
          onSelect={setAccentColor}
        />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
          <Button title="Save" onPress={save} loading={busy} style={{ flex: 1 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card padding="none" style={{ marginBottom: spacing.md }}>
        {clinics.map((c) => (
          <ListRow
            key={c.id}
            left={
              c.logoUrl ? (
                <Image source={{ uri: thumb(c.logoUrl, 80) }} style={{ width: 38, height: 38, borderRadius: 8 }} />
              ) : (
                <IconCircle name="medkit-outline" tone={c.id === clinicId ? "accent" : "neutral"} size={38} />
              )
            }
            title={c.name}
            subtitle={[c.address, c.phone].filter(Boolean).join(" · ")}
            right={c.id === clinicId ? <Badge tone="accent" text="Current" /> : undefined}
            onPress={canManage ? () => startEdit(c) : () => setViewing(c)}
          />
        ))}
      </Card>
      {canManage && <Button title="Add clinic" variant="secondary" onPress={() => startEdit("new")} />}
      <Text variant="caption" style={{ marginTop: spacing.md }}>
        Each clinic keeps its own branding, stock, purchases and printer. Patients are shared across your
        practice.
      </Text>
    </Screen>
  );
}
