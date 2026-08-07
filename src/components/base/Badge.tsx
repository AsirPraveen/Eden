import React from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "accent" | "warning" | "danger" | "info";

export function Badge({ text, tone = "neutral" }: { text: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.background, fg: colors.textSecondary },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: map.bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{ color: map.fg, fontSize: typography.size.xs, fontWeight: typography.weight.medium }}
      >
        {text}
      </Text>
    </View>
  );
}
