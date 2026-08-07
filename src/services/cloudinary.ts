import * as Crypto from "expo-crypto";
import { File, UploadType } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

// ---------------------------------------------------------------------------
// Cloudinary (free tier) - unsigned uploads, no backend needed.
//
// 1. Create a free account at https://cloudinary.com
// 2. Dashboard → note your Cloud name.
// 3. Settings → Upload → Upload presets → Add upload preset:
//      Signing mode: Unsigned, folder: "eden" (optional) → Save, note its name.
// 4. Add to .env.local:
//      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
//      EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
//      EXPO_PUBLIC_CLOUDINARY_API_KEY=...        (for deleting replaced images)
//      EXPO_PUBLIC_CLOUDINARY_API_SECRET=...     (for deleting replaced images)
// ---------------------------------------------------------------------------

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET ?? "";

export const isCloudinaryConfigured = CLOUD_NAME !== "" && UPLOAD_PRESET !== "";
export const canDeleteCloudinaryImages = isCloudinaryConfigured && API_KEY !== "" && API_SECRET !== "";

/** Extract Cloudinary public_id from a secure_url (handles transforms). */
export function publicIdFromCloudinaryUrl(url: string): string | null {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return null;
  let path = url.split("/upload/")[1] ?? "";
  path = path.replace(/^v\d+\//, "");
  const segments = path.split("/");
  const start = segments.findIndex((s) => !s.includes(",") && !/^[a-z]{1,2}_/.test(s));
  if (start === -1) return null;
  return segments
    .slice(start)
    .join("/")
    .replace(/\.[^/.]+$/, "");
}

async function signDestroy(publicId: string): Promise<{ timestamp: number; signature: string }> {
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, toSign);
  return { timestamp, signature };
}

/** Delete an image from Cloudinary by URL. No-op if credentials are missing. */
export async function deleteCloudinaryImage(url: string | null | undefined): Promise<void> {
  if (!url || !canDeleteCloudinaryImages) return;
  const publicId = publicIdFromCloudinaryUrl(url);
  if (!publicId) return;
  const { timestamp, signature } = await signDestroy(publicId);
  const body = new FormData();
  body.append("public_id", publicId);
  body.append("api_key", API_KEY);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Could not delete old image.");
  }
}

/**
 * Upload a local image (file:// uri) to Cloudinary; returns the https URL.
 *
 * Uses expo-file-system's native multipart upload rather than fetch+FormData -
 * RN's FormData no longer reliably accepts {uri,type,name} file parts on the
 * newer networking stack ("Unsupported FormDataPart implementation").
 */
export async function uploadImage(
  localUri: string,
  folder = "eden",
  mimeType: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Add the keys to .env.local (see docs).");
  }
  const file = new File(localUri);
  const result = await file.upload(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    parameters: { upload_preset: UPLOAD_PRESET, folder },
  });
  const json = JSON.parse(result.body);
  if (result.status < 200 || result.status >= 300 || !json.secure_url) {
    throw new Error(json?.error?.message ?? "Image upload failed.");
  }
  return json.secure_url as string;
}

/** Pick an image from the gallery (resized/compressed) and upload it. Returns null if cancelled. */
export async function pickAndUploadImage(folder = "eden", replaceUrl?: string | null): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Photo access was denied.");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const url = await uploadImage(result.assets[0].uri, folder);
  if (replaceUrl) {
    deleteCloudinaryImage(replaceUrl).catch(() => { });
  }
  return url;
}

/** Cloudinary URL transform helper, e.g. thumb(url, 160) for a 160px square. */
export function thumb(url: string, size = 160): string {
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}
