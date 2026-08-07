import React from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { typography } from "../../theme/tokens";

type Variant = "title" | "heading" | "subheading" | "body" | "secondary" | "caption" | "label";

const variantStyles: Record<Variant, Partial<TextStyle>> = {
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    lineHeight: typography.size.xxl * typography.lineHeight.tight,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  subheading: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.size.lg * typography.lineHeight.normal,
  },
  body: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.regular,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  secondary: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.regular,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  caption: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.regular,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },
};

export function Text({
  variant = "body",
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const { colors } = useTheme();
  const defaultColor =
    color ??
    (variant === "secondary" || variant === "caption" || variant === "label"
      ? colors.textSecondary
      : colors.text);
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: typography.fontFamily }, variantStyles[variant], { color: defaultColor }, style]}
    />
  );
}
