import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { FloatingTabBar } from "../../components/FloatingTabBar";
import { usePermissions } from "../../hooks/usePermissions";
import { useNotificationWatcher } from "../../hooks/useNotificationWatcher";
import { BrandingProvider } from "../../theme/BrandingProvider";
import { useSession } from "../../stores/useSession";
import { useTheme } from "../../theme/ThemeProvider";

export default function AppLayout() {
  const { colors } = useTheme();
  const { initialized, user, accountId } = useSession();
  const perms = usePermissions();
  useNotificationWatcher();

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  if (!accountId) return <Redirect href="/(auth)/onboarding" />;

  const showStock = perms.inventory;
  const showPatients = perms.patientManagement || perms.sales;
  const showDues = perms.expenses || perms.purchase;

  return (
    <BrandingProvider>
      <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen
        name="stock"
        options={{ title: "Stock", headerShown: false, href: showStock ? undefined : null }}
      />
      <Tabs.Screen
        name="patients"
        options={{ title: "Patients", headerShown: false, href: showPatients ? undefined : null }}
      />
      <Tabs.Screen
        name="dues"
        options={{ title: "Dues", headerShown: false, href: showDues ? undefined : null }}
      />
      <Tabs.Screen name="more" options={{ title: "More", headerShown: false }} />
    </Tabs>
    </BrandingProvider>
  );
}
