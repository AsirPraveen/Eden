import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "../stores/useSession";
import { ResolvedBranding, resolveBranding } from "./branding";

export const BrandingContext = createContext<ResolvedBranding | null>(null);

/** Provides per-clinic branding inside the authenticated app shell. */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { clinics, clinicId } = useSession();
  const clinic = useMemo(
    () => clinics.find((c) => c.id === clinicId) ?? clinics[0] ?? null,
    [clinics, clinicId]
  );
  const branding = useMemo(() => resolveBranding(clinic), [clinic]);
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): ResolvedBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) return resolveBranding(null);
  return ctx;
}
