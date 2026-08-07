/** @deprecated Use defaultBranding from ./branding - kept for gradual migration. */
import { defaultBranding } from "./branding";

export const brand = {
  name: defaultBranding.appName,
  shortName: defaultBranding.shortName,
  logo: defaultBranding.logo,
  navy: defaultBranding.primary,
  navyDark: defaultBranding.primaryDark,
  navyMid: defaultBranding.primaryMid,
  gold: defaultBranding.accent,
  goldLight: defaultBranding.accentLight,
  cream: defaultBranding.bannerText,
  onNavy: defaultBranding.onPrimary,
} as const;
