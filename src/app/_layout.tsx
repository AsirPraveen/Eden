import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";
import { SplashBackground } from "../components/SplashBackground";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { defaultBranding } from "../theme/branding";
import { useSession } from "../stores/useSession";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { colors, scheme } = useTheme();
  const { initialized } = useSession();

  useEffect(() => {
    if (initialized) SplashScreen.hideAsync().catch(() => {});
  }, [initialized]);

  if (!initialized) {
    return (
      <SplashBackground>
        <StatusBar style="dark" />
        <BrandLogo size="lg" useDefault />
      </SplashBackground>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: defaultBranding.splashBackground }}>
      <SafeAreaProvider>
        <KeyboardProvider preload={false}>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
