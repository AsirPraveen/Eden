import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

type Tone = "accent" | "warning" | "danger" | "info" | "neutral";

/** Small tinted circle with an icon - used as a leading visual in cards/rows. */
export function IconCircle({
  name,
  tone = "accent",
  size = 38,
}: {
  name: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  size?: number;
}) {
  const { colors } = useTheme();
  const map = {
    accent: { bg: colors.accentSoft, fg: colors.accent },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.background, fg: colors.textSecondary },
  }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: map.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={Math.round(size * 0.5)} color={map.fg} />
    </View>
  );
}
