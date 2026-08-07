import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../../theme/ThemeProvider";

export default function DuesLayout() {
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
      <Stack.Screen name="index" options={{ title: "Dues" }} />
      <Stack.Screen name="new-purchase" options={{ title: "Record purchase" }} />
      <Stack.Screen name="purchase/[id]" options={{ title: "Purchase" }} />
    </Stack>
  );
}
