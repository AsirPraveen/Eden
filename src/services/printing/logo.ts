import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";
import { defaultBranding, resolveBranding } from "../../theme/branding";
import { Clinic, Member } from "../../types/models";
import { formatDoctorDisplay } from "../../utils/doctor";
import { resolveDoctorSignatureUrl } from "../members";

const DEFAULT_LOGO_CACHE = `${FileSystem.cacheDirectory}eden-default-logo.png`;

function guessMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

async function readLocalAsDataUri(localUri: string, mime: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mime};base64,${base64}`;
}

/** Copy a remote or dev-server asset URI into cache, then return as data URI. */
async function fetchUriAsDataUri(uri: string, mime: string, cacheKey: string): Promise<string> {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const dest = `${FileSystem.cacheDirectory}${cacheKey}.${ext}`;
  const info = await FileSystem.getInfoAsync(dest);
  if (!info.exists) {
    await FileSystem.downloadAsync(uri, dest);
  }
  return readLocalAsDataUri(dest, mime);
}

/** Ensure a readable file:// path for a bundled image module (Android-safe). */
async function bundledModuleToCache(moduleId: number, cachePath: string): Promise<string> {
  const cached = await FileSystem.getInfoAsync(cachePath);
  if (cached.exists) return cachePath;

  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();

  const localUri = asset.localUri;
  if (localUri?.startsWith("file://")) {
    await FileSystem.copyAsync({ from: localUri, to: cachePath });
    return cachePath;
  }

  const resolved = Image.resolveAssetSource(moduleId);
  const uri = resolved?.uri;
  if (!uri) throw new Error("Could not resolve bundled logo.");

  if (uri.startsWith("file://")) {
    await FileSystem.copyAsync({ from: uri, to: cachePath });
  } else {
    await FileSystem.downloadAsync(uri, cachePath);
  }
  return cachePath;
}

/** Load the bundled default logo into a base64 data URI (works on Android release builds). */
async function defaultBundledLogoDataUri(): Promise<string | null> {
  try {
    const path = await bundledModuleToCache(defaultBranding.logo as number, DEFAULT_LOGO_CACHE);
    return readLocalAsDataUri(path, "image/png");
  } catch {
    return null;
  }
}

/** Resolve a clinic logo as a base64 data URI for offline-safe PDF rendering. */
export async function resolveClinicLogoDataUri(clinic: Clinic): Promise<string | null> {
  if (clinic.logoUrl) {
    try {
      return await fetchUriAsDataUri(clinic.logoUrl, guessMime(clinic.logoUrl), `clinic-logo-${clinic.id}`);
    } catch {
      // fall through to default bundled logo
    }
  }

  return defaultBundledLogoDataUri();
}

export type PrintBranding = {
  logoDataUri: string | null;
  signatureDataUri: string | null;
  doctorDisplayName: string | null;
  primary: string;
  accent: string;
  displayName: string;
};

export async function resolvePrintBranding(
  clinic: Clinic,
  accountId?: string | null,
  member?: Member | null
): Promise<PrintBranding> {
  const b = resolveBranding(clinic);
  const logoDataUri = await resolveClinicLogoDataUri(clinic);

  let signatureDataUri: string | null = null;
  if (accountId) {
    try {
      const sigUrl = await resolveDoctorSignatureUrl(accountId, clinic, member ?? null);
      if (sigUrl) {
        signatureDataUri = await fetchUriAsDataUri(sigUrl, guessMime(sigUrl), `doctor-sig-${accountId}`);
      }
    } catch {
      // Offline or permission - PDF still generates without signature.
    }
  }

  return {
    logoDataUri,
    signatureDataUri,
    doctorDisplayName: clinic.doctorName ? formatDoctorDisplay(clinic.doctorName) : null,
    primary: b.primary,
    accent: b.accent,
    displayName: b.displayName,
  };
}
