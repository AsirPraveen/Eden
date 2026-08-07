import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React from "react";
import { View } from "react-native";
import { Card, IconCircle, Screen, Text } from "../../../components/base";
import { defaultBranding } from "../../../theme/branding";
import { spacing } from "../../../theme/tokens";

const APP_NAME = Constants.expoConfig?.name ?? defaultBranding.appName;

const SECTIONS: { title: string; body: string; icon: React.ComponentProps<typeof Ionicons>["name"]; tone: "accent" | "info" | "warning" | "neutral" }[] = [
  {
    title: "What we store",
    icon: "cloud-outline",
    tone: "info",
    body:
      `Your practice data - clinics, medicines, stock, purchases, suppliers, patients and prescriptions - is stored in Google Firebase (Firestore) servers, encrypted at rest and in transit. ${APP_NAME} does not sell or share this data with anyone.`,
  },
  {
    title: "Patient data & consent",
    icon: "shield-checkmark-outline",
    tone: "accent",
    body:
      "Under India's Digital Personal Data Protection Act 2023, patient records are personal data and the doctor is responsible for them. Collect the patient's consent before saving their details, store only what is needed for care and billing, and delete a patient's record if they ask (open the patient and use Remove - managers only).",
  },
  {
    title: "Prescriptions",
    icon: "medical-outline",
    tone: "warning",
    body:
      "Printed prescriptions carry the clinic name, doctor name and registration number you set in More → Clinics. The medical content of every prescription is the prescribing doctor's responsibility.",
  },
  {
    title: "Your account",
    icon: "lock-closed-outline",
    tone: "neutral",
    body:
      "Each practice's data is isolated - no other account can read it. Members you disable lose access immediately. To export or permanently delete all your practice data, contact support; deletion is completed within 30 days.",
  },
];

export default function Legal() {
  return (
    <Screen>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ marginBottom: spacing.md, flexDirection: "row", gap: spacing.md }}>
          <IconCircle name={s.icon} tone={s.tone} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="subheading" style={{ marginBottom: spacing.sm }}>
              {s.title}
            </Text>
            <Text variant="secondary">{s.body}</Text>
          </View>
        </Card>
      ))}
      <Text variant="caption" style={{ textAlign: "center", marginTop: spacing.md }}>
        {APP_NAME}
      </Text>
    </Screen>
  );
}
