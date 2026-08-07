import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BrandingContext } from "./BrandingProvider";
import { mergeBrandingColors, ResolvedBranding, resolveBranding } from "./branding";
import { ThemeColors, lightColors, darkColors } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  branding: ResolvedBranding;
};

type BaseThemeContext = {
  baseColors: ThemeColors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<BaseThemeContext | null>(null);

const STORAGE_KEY = "eden.themePreference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setPreferenceState(v);
    });
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const scheme: "light" | "dark" =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({
      baseColors: scheme === "dark" ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const brandingCtx = useContext(BrandingContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");

  const branding = brandingCtx ?? resolveBranding(null);
  const colors = useMemo(
    () => mergeBrandingColors(ctx.baseColors, branding, ctx.scheme),
    [ctx.baseColors, branding, ctx.scheme]
  );

  return {
    colors,
    scheme: ctx.scheme,
    preference: ctx.preference,
    setPreference: ctx.setPreference,
    branding,
  };
}
