import React, { useRef, useState } from "react";
import { Alert, Image, View } from "react-native";
import { router } from "expo-router";
import { updateDoc } from "firebase/firestore";
import { Button, Card, Screen, Text } from "../../../components/base";
import { SignaturePad, SignaturePadRef } from "../../../components/SignaturePad";
import { deleteCloudinaryImage, isCloudinaryConfigured, uploadImage } from "../../../services/cloudinary";
import { memberDoc } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { spacing } from "../../../theme/tokens";

export default function DoctorSignature() {
  const { accountId, member } = useSession();
  const canManage = useCanManage();
  const padRef = useRef<SignaturePadRef>(null);
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    return (
      <Screen>
        <Text variant="body">Only doctors can save a prescription signature.</Text>
      </Screen>
    );
  }

  const save = async () => {
    if (!accountId || !member) return;
    if (!isCloudinaryConfigured) {
      Alert.alert(
        "Cloudinary not set up",
        "Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local."
      );
      return;
    }
    if (padRef.current?.isEmpty()) {
      Alert.alert("Draw your signature", "Sign in the box above before saving.");
      return;
    }

    setSaving(true);
    try {
      const localUri = await padRef.current!.capture();
      const url = await uploadImage(localUri, "eden/signatures", "image/png");
      if (member.signatureUrl) {
        deleteCloudinaryImage(member.signatureUrl).catch(() => {});
      }
      await updateDoc(memberDoc(accountId, member.uid), { signatureUrl: url });
      Alert.alert("Saved", "Your signature will appear on A4 prescriptions.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Could not save", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const clearPad = () => padRef.current?.clear();

  return (
    <Screen>
      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="body">
          Draw your signature below. It will be printed at the bottom of A4 prescriptions. Staff members use the
          practice doctor&apos;s signature automatically.
        </Text>
      </Card>

      {member?.signatureUrl ? (
        <Card style={{ marginBottom: spacing.md, alignItems: "center" }}>
          <Text variant="label" style={{ marginBottom: spacing.sm, alignSelf: "flex-start" }}>
            Current signature
          </Text>
          <Image
            source={{ uri: member.signatureUrl }}
            style={{ width: "100%", height: 80, resizeMode: "contain" }}
          />
        </Card>
      ) : null}

      <Text variant="label" style={{ marginBottom: spacing.sm }}>
        {member?.signatureUrl ? "Draw a new signature" : "Your signature"}
      </Text>
      <SignaturePad ref={padRef} height={220} />

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Button title="Clear" variant="secondary" onPress={clearPad} disabled={saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Save signature" onPress={save} loading={saving} />
        </View>
      </View>
    </Screen>
  );
}
