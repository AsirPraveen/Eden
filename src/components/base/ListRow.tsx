import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { Text } from "./Text";

export function ListRow({
  title,
  subtitle,
  left,
  right,
  rightSub,
  onPress,
  chevron,
  children,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode | string;
  rightSub?: React.ReactNode | string;
  onPress?: () => void;
  /** Show a trailing chevron (defaults to true when pressable and no right content). */
  chevron?: boolean;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const showChevron = chevron ?? (!!onPress && right === undefined && rightSub === undefined);

  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.background : "transparent" },
      ]}
    >
      {left ? <View style={styles.leftSlot}>{left}</View> : null}
      <View style={styles.left}>
        <Text variant="body" numberOfLines={1} style={{ fontWeight: "500" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {(right || rightSub) && (
        <View style={styles.right}>
          {typeof right === "string" ? <Text variant="body">{right}</Text> : right}
          {typeof rightSub === "string" ? (
            <Text variant="caption" style={{ marginTop: 2 }}>
              {rightSub}
            </Text>
          ) : (
            rightSub
          )}
        </View>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </View>
  );

  if (!onPress) return content(false);
  return <Pressable onPress={onPress}>{({ pressed }) => content(pressed)}</Pressable>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  leftSlot: { marginRight: 2 },
  left: { flex: 1 },
  right: { alignItems: "flex-end" },
});
