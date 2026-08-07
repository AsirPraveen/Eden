import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { updateDoc } from "firebase/firestore";
import { Avatar, Badge, Card, IconCircle, ListRow, Screen, Text } from "../../../components/base";
import { isCloudinaryConfigured, pickAndUploadImage } from "../../../services/cloudinary";
import { memberDoc } from "../../../services/paths";
import { signOut } from "../../../services/auth";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCanManage, useSession } from "../../../stores/useSession";
import { ThemePreference, useTheme } from "../../../theme/ThemeProvider";
import { palette, spacing } from "../../../theme/tokens";

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export default function More() {
  const { preference, setPreference, colors, scheme } = useTheme();
  const { member, accountId } = useSession();
  const perms = usePermissions();
  const canManage = useCanManage();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const changePhoto = async () => {
    if (!accountId || !member) return;
    if (!isCloudinaryConfigured) {
      Alert.alert(
        "Cloudinary not set up",
        "Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local."
      );
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage("eden/profiles", member.photoUrl);
      if (url) {
        await updateDoc(memberDoc(accountId, member.uid), { photoUrl: url });
      }
    } catch (e) {
      Alert.alert("Could not update photo", (e as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const doSignOut = () => {
    Alert.alert("Sign out?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut().then(() => router.replace("/(auth)/sign-in")) },
    ]);
  };

  return (
    <Screen>
      <Card style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Pressable onPress={changePhoto} disabled={uploadingPhoto} style={{ position: "relative" }}>
          <Avatar name={member?.name || member?.email || "?"} photoUrl={member?.photoUrl} size={48} />
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: palette.neutral0,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: scheme === "dark" ? colors.cta : palette.navy900,
              ...(scheme === "dark"
                ? { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }
                : {}),
            }}
          >
            <Ionicons name="camera" size={14} color={palette.navy900} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{member?.name ?? ""}</Text>
          <Text variant="caption" style={{ marginTop: 2 }}>
            {member?.email ?? ""} · {member?.role ?? ""}
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            Tap photo to change
          </Text>
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.md }}>
          Appearance
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {THEME_OPTIONS.map((o) => (
            <Pressable key={o.key} onPress={() => setPreference(o.key)}>
              <Badge text={o.label} tone={preference === o.key ? "accent" : "neutral"} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ padding: 0, marginBottom: spacing.md }}>
        {perms.reports && (
          <ListRow title="Reports" subtitle="Revenue, purchases, top medicines" left={<IconCircle name="stats-chart-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/reports")} />
        )}
        <ListRow title="Activity" subtitle="Full audit trail of stock and money" left={<IconCircle name="time-outline" tone="info" size={34} />} onPress={() => router.push("/(app)/more/activity")} />
        <ListRow title="Printer" subtitle="Thermal printer for prescriptions" left={<IconCircle name="print-outline" tone="neutral" size={34} />} onPress={() => router.push("/(app)/more/printer")} />
        {canManage && (
          <ListRow
            title="Doctor signature"
            subtitle="Draw signature for A4 prescriptions"
            left={<IconCircle name="create-outline" tone="accent" size={34} />}
            onPress={() => router.push("/(app)/more/doctor-signature" as Href)}
          />
        )}
      </Card>

      <Card style={{ padding: 0, marginBottom: spacing.md }}>
        {perms.supplierManagement && (
          <ListRow title="Suppliers" subtitle="Reps and companies you buy from" left={<IconCircle name="business-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/suppliers")} />
        )}
        {member?.role === "staff" ? (
          <>
            <ListRow title="Clinics" subtitle="Clinics you have access to" left={<IconCircle name="medkit-outline" tone="info" size={34} />} onPress={() => router.push("/(app)/more/clinics")} />
            <ListRow title="Join clinic" subtitle="Enter invite code from another practice" left={<IconCircle name="add-circle-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/join-clinic")} />
            <ListRow title="Team" subtitle="Doctors in your practice" left={<IconCircle name="people-outline" tone="neutral" size={34} />} onPress={() => router.push("/(app)/more/staff")} />
            <ListRow title="Staff permissions" subtitle="What you are allowed to do" left={<IconCircle name="shield-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/staff-settings")} />
          </>
        ) : (
          <>
            <ListRow title="Clinics" subtitle="Details printed on prescriptions" left={<IconCircle name="medkit-outline" tone="info" size={34} />} onPress={() => router.push("/(app)/more/clinics")} />
            <ListRow title="Join clinic" subtitle="Enter invite code from another practice" left={<IconCircle name="add-circle-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/join-clinic")} />
            {canManage && (
              <>
                <ListRow title="Team" subtitle="Invite doctors and staff" left={<IconCircle name="people-outline" tone="neutral" size={34} />} onPress={() => router.push("/(app)/more/staff")} />
                <ListRow title="Staff permissions" subtitle="Control what staff can access" left={<IconCircle name="shield-outline" tone="accent" size={34} />} onPress={() => router.push("/(app)/more/staff-settings")} />
              </>
            )}
          </>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <ListRow title="Privacy & terms" left={<IconCircle name="shield-checkmark-outline" tone="neutral" size={34} />} onPress={() => router.push("/(app)/more/legal")} />
        <ListRow title="Sign out" left={<IconCircle name="log-out-outline" tone="danger" size={34} />} onPress={doSignOut} chevron={false} />
      </Card>

      <View style={{ alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.md }}>
        <Text variant="caption" color={colors.textMuted} style={{ fontSize: 12 }}>
          Powered by Eden
        </Text>
      </View>
    </Screen>
  );
}
