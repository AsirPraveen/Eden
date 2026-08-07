import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, shadow, spacing } from "../../theme/tokens";

export function Card({
  style,
  children,
  flat = false,
  raised = false,
  padding,
  ...rest
}: ViewProps & {
  flat?: boolean;
  raised?: boolean;
  padding?: number | "none";
}) {
  const { colors, scheme } = useTheme();
  const pad = padding === "none" ? 0 : padding ?? spacing.lg;

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: raised && scheme === "dark" ? colors.surfaceRaised : colors.surface,
          borderColor: raised ? colors.borderStrong : colors.border,
          padding: pad,
        },
        !flat && scheme === "light" && (raised ? shadow.raised : shadow.card),
        !flat && scheme === "dark" && raised && { borderWidth: StyleSheet.hairlineWidth * 2 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
