import React from "react";
import { Redirect } from "expo-router";
import { BrandLogo } from "../components/BrandLogo";
import { SplashBackground } from "../components/SplashBackground";
import { useSession } from "../stores/useSession";

/** Entry gate: routes to auth, onboarding, or the app based on session state. */
export default function Index() {
  const { initialized, user, accountId } = useSession();

  if (!initialized) {
    return (
      <SplashBackground>
        <BrandLogo size="lg" useDefault />
      </SplashBackground>
    );
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!accountId) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(app)/home" />;
}
