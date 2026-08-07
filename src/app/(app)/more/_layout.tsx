import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../../theme/ThemeProvider";

export default function MoreLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "More" }} />
      <Stack.Screen name="printer" options={{ title: "Printer" }} />
      <Stack.Screen name="doctor-signature" options={{ title: "Doctor signature" }} />
      <Stack.Screen name="reports" options={{ title: "Reports" }} />
      <Stack.Screen name="activity" options={{ title: "Activity" }} />
      <Stack.Screen name="suppliers" options={{ title: "Suppliers" }} />
      <Stack.Screen name="clinics" options={{ title: "Clinics" }} />
      <Stack.Screen name="staff" options={{ title: "Team" }} />
      <Stack.Screen name="staff-settings" options={{ title: "Staff permissions" }} />
      <Stack.Screen name="join-clinic" options={{ title: "Join Clinic" }} />
      <Stack.Screen name="legal" options={{ title: "Privacy & terms" }} />
    </Stack>
  );
}
