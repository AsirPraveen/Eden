import React from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { Text } from "./Text";

/** Centered loading indicator for list screens and async views. */
export function LoadingState({ message = "Loading…" }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text variant="secondary" color={colors.textMuted}>
        {message}
      </Text>
    </Animated.View>
  );
}
