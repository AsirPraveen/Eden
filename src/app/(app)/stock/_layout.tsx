import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../../theme/ThemeProvider";

export default function StockLayout() {
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
      <Stack.Screen name="index" options={{ title: "Stock" }} />
      <Stack.Screen name="medicine/[id]" options={{ title: "Medicine" }} />
      <Stack.Screen name="new-medicine" options={{ title: "Add medicine", presentation: "modal" }} />
    </Stack>
  );
}
