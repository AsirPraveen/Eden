import { Image, ImageStyle, StyleProp, View, ViewStyle } from "react-native";
import { useBranding } from "../theme/BrandingProvider";
import { defaultBranding } from "../theme/branding";
import { Text } from "./base";

type Size = "sm" | "md" | "lg" | "hero";

const SIZES: Record<Size, { width: number; height: number; fontSize: number }> = {
  sm: { width: 36, height: 36, fontSize: 13 },
  md: { width: 52, height: 52, fontSize: 15 },
  lg: { width: 120, height: 120, fontSize: 17 },
  hero: { width: 200, height: 200, fontSize: 20 },
};

/** Clinic logo with optional wordmark - uses clinic settings when available. */
export function BrandLogo({
  size = "md",
  showName = false,
  light = false,
  style,
  imageStyle,
  /** Force default app logo (auth screens). */
  useDefault = false,
}: {
  size?: Size;
  showName?: boolean;
  light?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  useDefault?: boolean;
}) {
  const branding = useBranding();
  const dim = SIZES[size];
  const displayName = useDefault ? defaultBranding.appName : branding.displayName;
  const source = useDefault ? defaultBranding.logo : branding.logoSource;

  return (
    <View style={[{ alignItems: "center" }, style]}>
      <Image
        source={source}
        style={[{ width: dim.width, height: dim.height, resizeMode: "contain" }, imageStyle]}
        accessibilityLabel={displayName}
      />
      {showName && (
        <Text
          style={{
            marginTop: size === "hero" ? 12 : 6,
            fontSize: dim.fontSize,
            fontWeight: "700",
            color: light ? branding.bannerText : branding.primaryMid,
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          {displayName}
        </Text>
      )}
    </View>
  );
}
