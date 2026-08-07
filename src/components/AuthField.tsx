import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";
import { Text } from "./base";

/**
 * Filled auth-style input with a leading icon inside a colored circle chip
 * (Mediora-style), focus ring, and optional password reveal.
 */
export function AuthField({
  icon,
  error,
  secureTextEntry,
  ...rest
}: TextInputProps & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  error?: string;
}) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: scheme === "light" ? colors.surface : colors.surfaceRaised,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={[styles.iconChip, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon} size={17} color={colors.accent} />
        </View>
        <TextInput
          placeholderTextColor={colors.placeholder}
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: spacing.xs, marginLeft: spacing.sm }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    minHeight: 58,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.md,
    paddingVertical: spacing.md,
  },
});
