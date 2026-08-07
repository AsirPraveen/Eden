import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../../theme/ThemeProvider";

export default function PatientsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Patients" }} />
      <Stack.Screen name="new" options={{ title: "New patient", presentation: "modal" }} />
      <Stack.Screen name="[id]" options={{ title: "Patient" }} />
      <Stack.Screen name="prescribe" options={{ title: "New prescription" }} />
      <Stack.Screen name="visit/[id]" options={{ title: "Visit" }} />
    </Stack>
  );
}
