import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { Button } from "./Button";
import { IconCircle } from "./IconCircle";
import { Text } from "./Text";

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
  icon,
}: {
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(18)}
      style={{ alignItems: "center", padding: spacing.xxl, gap: spacing.sm }}
    >
      {icon ? (
        <View style={{ marginBottom: spacing.sm }}>
          <IconCircle name={icon} tone="accent" size={52} />
        </View>
      ) : null}
      <Text variant="subheading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text variant="secondary" color={colors.textSecondary} style={{ textAlign: "center", lineHeight: 22 }}>
          {message}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="secondary" style={{ marginTop: spacing.md }} />
      ) : null}
    </Animated.View>
  );
}
