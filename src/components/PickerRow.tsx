import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { IconCircle, Text } from "./base";

/** Rich tappable selector row (patient / supplier pickers). */
export function PickerRow({
  icon,
  label,
  required,
  value,
  subtitle,
  placeholder,
  onPress,
}: {
  icon: React.ComponentProps<typeof IconCircle>["name"];
  label: string;
  required?: boolean;
  value?: string | null;
  subtitle?: string;
  placeholder: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
        <Text variant="caption">{label}</Text>
        {required ? (
          <Text variant="caption" color={colors.danger}>
            {" *"}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: value ? colors.accent : colors.border }]}>
          <IconCircle name={icon} tone={value ? "accent" : "neutral"} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="body" numberOfLines={1} style={{ fontWeight: value ? "600" : "400" }} color={value ? colors.text : colors.placeholder}>
              {value ?? placeholder}
            </Text>
            {value && subtitle ? (
              <Text variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name={value ? "swap-horizontal" : "chevron-down"} size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    </View>
  );
}

/** Dashed "add item" button (medicines on prescriptions/purchases). */
export function AddItemButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View style={[styles.add, { borderColor: colors.accent }]}>
        <Ionicons name="add-circle" size={20} color={colors.accent} />
        <Text variant="body" color={colors.accent} style={{ fontWeight: "600" }}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  add: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: spacing.lg,
  },
});
