import React, { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../stores/useSession";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { Text } from "./base";

/** Header control showing the current clinic; tap to switch. Pass `light` when placed on a dark banner. */
export function ClinicSwitcher({ light = false }: { light?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clinics, clinicId, setClinicId } = useSession();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);
  const triggerRef = useRef<View>(null);
  const current = clinics.find((c) => c.id === clinicId);
  const textColor = light ? "rgba(245,242,233,0.9)" : undefined;
  const iconColor = light ? "rgba(245,242,233,0.9)" : colors.textSecondary;

  if (clinics.length === 0) return null;

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y: y + height, width });
      setOpen(true);
    });
  };

  const DROPDOWN_WIDTH = 220;

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={() => clinics.length > 1 && openMenu()}
        style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text variant="caption" color={textColor} numberOfLines={1} style={{ maxWidth: 140 }}>
          {current?.name ?? "Clinic"}
        </Text>
        {clinics.length > 1 && <Ionicons name="chevron-down" size={14} color={iconColor} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          {anchor && (
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  position: "absolute",
                  top: Math.max(insets.top + spacing.xs, anchor.y + spacing.xs),
                  right: Math.max(spacing.lg, spacing.lg),
                  left: Math.max(spacing.lg, anchor.x + anchor.width - DROPDOWN_WIDTH),
                  width: DROPDOWN_WIDTH,
                },
              ]}
            >
              <Text variant="label" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
                Switch clinic
              </Text>
              {clinics.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClinicId(c.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: pressed ? colors.background : "transparent" },
                  ]}
                >
                  <Text variant="body" numberOfLines={1} style={{ fontWeight: c.id === clinicId ? "600" : "400", flex: 1 }}>
                    {c.name}
                  </Text>
                  {c.id === clinicId && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
