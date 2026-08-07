import { Platform } from "react-native";

// JVN Ayush Clinic design tokens - navy primary, gold accents, clean neutrals.

export const palette = {
  navy900: "#0A1628",
  navy800: "#0F2240",
  navy700: "#1A3560",
  navy600: "#234878",
  navy100: "#E8EDF5",

  gold700: "#9A7B1A",
  gold600: "#C5A028",
  gold500: "#D4AF37",
  gold100: "#F5EDD6",

  leaf600: "#2D6A3E",
  leaf100: "#E4F0E7",

  neutral0: "#FFFFFF",
  neutral50: "#F8F9FB",
  neutral100: "#F0F2F5",
  neutral200: "#E2E5EA",
  neutral300: "#C8CDD4",
  neutral400: "#9AA0A8",
  neutral500: "#6B717A",
  neutral600: "#4E545C",
  neutral700: "#363B42",
  neutral800: "#242830",
  neutral900: "#14171C",

  red600: "#B3402F",
  red100: "#F6E4E1",
  amber600: "#9A6B15",
  amber100: "#F5EBD6",
  blue600: "#2F5E8F",
  blue100: "#E1EAF2",
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  cta: string;
  onCta: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  inputBackground: string;
  placeholder: string;
};

export const lightColors: ThemeColors = {
  background: palette.neutral50,
  surface: palette.neutral0,
  surfaceRaised: palette.neutral0,
  border: palette.neutral200,
  borderStrong: palette.neutral300,
  text: palette.neutral900,
  textSecondary: palette.neutral600,
  textMuted: palette.neutral400,
  accent: palette.navy700,
  accentSoft: palette.navy100,
  onAccent: palette.neutral0,
  cta: palette.gold600,
  onCta: palette.navy900,
  danger: palette.red600,
  dangerSoft: palette.red100,
  warning: palette.amber600,
  warningSoft: palette.amber100,
  info: palette.blue600,
  infoSoft: palette.blue100,
  inputBackground: palette.neutral0,
  placeholder: palette.neutral400,
};

export const darkColors: ThemeColors = {
  background: "#0E1118",
  surface: "#161B24",
  surfaceRaised: "#1C2230",
  border: "#2A3140",
  borderStrong: "#3A4354",
  text: "#ECEEF2",
  textSecondary: "#A8AEB8",
  textMuted: "#6E7580",
  accent: "#7A9BC4",
  accentSoft: "#1E2A3D",
  onAccent: palette.neutral0,
  cta: palette.gold500,
  onCta: palette.navy900,
  danger: "#D98A7C",
  dangerSoft: "#3B2622",
  warning: "#CFA75E",
  warningSoft: "#39301D",
  info: "#8CB0D4",
  infoSoft: "#22303D",
  inputBackground: "#161B24",
  placeholder: "#6E7580",
};

/** Bottom clearance so list/scroll content isn't hidden behind the floating tab bar. */
export const tabBarClearance = 100;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 999,
} as const;

/** Soft elevation used on cards/raised surfaces (subtle in light, none in dark). */
export const shadow = {
  card: {
    shadowColor: "#0A1628",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: "#0A1628",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const typography = {
  fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.55,
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;
