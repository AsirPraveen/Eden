import React from "react";
import { Image, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { thumb } from "../../services/cloudinary";
import { Text } from "./Text";

/** Initials avatar with optional profile photo. */
export function Avatar({
  name,
  photoUrl,
  size = 40,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const { colors, scheme } = useTheme();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: thumb(photoUrl, Math.round(size * 2)) }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.border,
        }}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  const tints =
    scheme === "dark"
      ? ["#243B30", "#22303D", "#39301D", "#332638", "#1F3336"]
      : ["#E3EFE8", "#E1EAF2", "#F5EBD6", "#EFE4F1", "#DFEDEE"];
  const fgs =
    scheme === "dark"
      ? ["#7FAE95", "#8CB0D4", "#CFA75E", "#B792C4", "#7FB3B9"]
      : ["#1A3560", "#2F5E8F", "#C5A028", "#7A4E8A", "#2D6A3E"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % tints.length;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tints[idx],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: fgs[idx], fontWeight: "600", fontSize: size * 0.38 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}
