import React from "react";
import { ImageBackground, StyleSheet, ViewStyle } from "react-native";
import { defaultBranding } from "../theme/branding";

/** Vegan-leather textured splash background with centered children (logo). */
export function SplashBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ImageBackground
      source={defaultBranding.splashTexture}
      resizeMode="cover"
      style={[styles.bg, style]}
      imageStyle={styles.image}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultBranding.splashBackground,
  },
  image: {
    opacity: 1,
  },
});
