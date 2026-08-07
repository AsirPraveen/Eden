import Constants from "expo-constants";
import { ImageSourcePropType } from "react-native";
import { Clinic } from "../types/models";
import { ThemeColors } from "./tokens";

/** Platform default branding - used when no clinic is selected or fields are unset. */
export const defaultBranding = {
  appName: Constants.expoConfig?.name ?? "Eden",
  shortName: "Eden",
  logo: require("../../assets/images/JVN_LOGO.png") as ImageSourcePropType,
  primary: "#0F2240",
  primaryDark: "#0A1628",
  primaryMid: "#1A3560",
  accent: "#C5A028",
  accentLight: "#D4AF37",
  onPrimary: "#FFFFFF",
  bannerText: "#F8F6F0",
  /** Warm beige vegan-leather tone - splash fallback / letterbox color. */
  splashBackground: "#F5EBD6",
  splashTexture: require("../../assets/images/leather-texture.png") as ImageSourcePropType,
  splashFull: require("../../assets/images/splash-full.png") as ImageSourcePropType,
} as const;

export type ResolvedBranding = {
  displayName: string;
  shortName: string;
  logoUri: string | null;
  logoSource: ImageSourcePropType;
  primary: string;
  primaryDark: string;
  primaryMid: string;
  accent: string;
  accentLight: string;
  onPrimary: string;
  bannerText: string;
};

/** Resolve branding for a clinic, falling back to platform defaults. */
export function resolveBranding(clinic?: Clinic | null): ResolvedBranding {
  return {
    displayName: clinic?.name?.trim() || defaultBranding.appName,
    shortName: clinic?.name?.trim()?.split(/\s+/)[0] || defaultBranding.shortName,
    logoUri: clinic?.logoUrl ?? null,
    logoSource: clinic?.logoUrl ? { uri: clinic.logoUrl } : defaultBranding.logo,
    primary: clinic?.primaryColor?.trim() || defaultBranding.primary,
    primaryDark: clinic?.primaryColor?.trim() || defaultBranding.primaryDark,
    primaryMid: clinic?.primaryColor?.trim() || defaultBranding.primaryMid,
    accent: clinic?.accentColor?.trim() || defaultBranding.accent,
    accentLight: clinic?.accentColor?.trim() || defaultBranding.accentLight,
    onPrimary: defaultBranding.onPrimary,
    bannerText: defaultBranding.bannerText,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function blendHex(hex: string, withWhite: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * withWhite);
  const r = mix(rgb.r).toString(16).padStart(2, "0");
  const g = mix(rgb.g).toString(16).padStart(2, "0");
  const b = mix(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Apply clinic primary/accent onto the base theme palette. */
export function mergeBrandingColors(
  base: ThemeColors,
  branding: ResolvedBranding,
  scheme: "light" | "dark"
): ThemeColors {
  const primary = branding.primary;
  const accent = branding.accent;
  if (scheme === "dark") {
    return {
      ...base,
      accent: blendHex(primary, 0.55),
      accentSoft: `${primary}33`,
      cta: accent,
      onCta: defaultBranding.primaryDark,
    };
  }
  return {
    ...base,
    accent: primary,
    accentSoft: blendHex(primary, 0.88),
    cta: accent,
    onCta: defaultBranding.primaryDark,
  };
}

export const BRANDING_PRESETS: { label: string; primary: string; accent: string }[] = [
  { label: "Navy & Gold", primary: "#0F2240", accent: "#C5A028" },
  { label: "Teal & Amber", primary: "#0D4F4F", accent: "#D4880A" },
  { label: "Burgundy", primary: "#5C1A2E", accent: "#C5A028" },
  { label: "Forest", primary: "#1B4332", accent: "#D4A574" },
];
