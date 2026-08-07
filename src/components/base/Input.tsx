import React from "react";
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";
import { Text } from "./Text";

export function Input({
  label,
  required,
  error,
  containerStyle,
  style,
  ...rest
}: TextInputProps & { label?: string; required?: boolean; error?: string; containerStyle?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label ? (
        <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
          <Text variant="caption">{label}</Text>
          {required ? (
            <Text variant="caption" color={colors.danger}>
              {" *"}
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    minHeight: 46,
  },
});
