import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";
import { Text } from "./Text";

/** Icon + label selectable chip - richer alternative to a plain Badge for form pickers. */
export function SelectChip({
  icon,
  label,
  selected,
  onPress,
  expand,
  compact,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Fill the parent width evenly (use inside a flex:1 wrapper). */
  expand?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, flex: expand ? 1 : undefined, minWidth: expand ? 0 : undefined })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: expand ? "center" : undefined,
          gap: compact ? 4 : 6,
          flex: expand ? 1 : undefined,
          borderRadius: radius.full,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          paddingVertical: compact ? 7 : 8,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
        }}
      >
        <Ionicons name={icon} size={compact ? 14 : 15} color={selected ? colors.accent : colors.textMuted} />
        <Text
          variant="caption"
          color={selected ? colors.accent : colors.textSecondary}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontWeight: selected ? "700" : "500", textTransform: "capitalize", flexShrink: 1 }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
