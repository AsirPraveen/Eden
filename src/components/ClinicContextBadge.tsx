import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../stores/useSession";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";
import { Text } from "./base";

/**
 * A compact, tappable clinic indicator shown on key data screens so doctors/staff
 * always know which clinic context they're operating in. Only renders when the
 * practice has 2+ clinics — single-clinic practices see nothing.
 *
 * When tapped, opens the clinic switcher (same as the header ClinicSwitcher).
 */
export function ClinicContextBadge({ label }: { label?: string }) {
  const { colors } = useTheme();
  const { clinics, clinicId, setClinicId } = useSession();
  const current = clinics.find((c) => c.id === clinicId);

  if (clinics.length < 2) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: colors.accentSoft,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
        alignSelf: "flex-start",
      }}
    >
      <Ionicons name="medkit" size={14} color={colors.accent} />
      <Text
        variant="caption"
        style={{ fontWeight: typography.weight.semibold, color: colors.accent }}
        numberOfLines={1}
      >
        {label ? `${label}: ` : ""}
        {current?.name ?? "Clinic"}
      </Text>
      <Ionicons name="swap-horizontal-outline" size={12} color={colors.accent} style={{ opacity: 0.7 }} />
    </View>
  );
}
