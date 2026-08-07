import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthField } from "../../components/AuthField";
import { BrandLogo } from "../../components/BrandLogo";
import { Button, Text } from "../../components/base";
import { friendlyAuthError, signUp } from "../../services/auth";
import { syncSessionForUser } from "../../stores/useSession";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../utils/formErrors";

type SignUpField = "name" | "email" | "password" | "confirm" | "_form";

export default function SignUp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: FieldErrors<SignUpField> = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!email.trim()) next.email = "Enter your email.";
    if (password.length < 6) next.password = "Password should be at least 6 characters.";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      const user = await signUp(name, email, password);
      await syncSessionForUser(user);
      router.replace("/(auth)/onboarding");
    } catch (e) {
      setErrors({ _form: friendlyAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        flexGrow: 1,
      }}
      bottomOffset={spacing.md}
      extraKeyboardSpace={spacing.lg}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: spacing.lg, alignSelf: "flex-start" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </View>
        </Pressable>

        <BrandLogo size="md" showName useDefault style={{ marginBottom: spacing.lg }} />

        <Text variant="title" style={{ textAlign: "center" }}>
          Register with us!
        </Text>
        <Text variant="secondary" style={{ textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl }}>
          One account for doctors and clinic staff
        </Text>

        <AuthField
          icon="person-outline"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => withoutField(e, "name"));
          }}
          placeholder="Full name (Dr. John Doe)"
          error={errors.name}
        />
        <AuthField
          icon="mail-outline"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrors((e) => withoutField(e, "email"));
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email address"
          error={errors.email}
        />
        <AuthField
          icon="lock-closed-outline"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrors((e) => withoutField(e, "password"));
          }}
          secureTextEntry
          placeholder="Password (min. 6 characters)"
          error={errors.password}
        />
        <AuthField
          icon="shield-checkmark-outline"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            setErrors((e) => withoutField(e, "confirm"));
          }}
          secureTextEntry
          placeholder="Confirm password"
          error={errors.confirm ?? errors._form}
        />
        <Button title="Sign Up" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, gap: 6 }}>
          <Text variant="secondary">Already have an account?</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text variant="body" color={colors.accent} style={{ fontWeight: "700" }}>
              Sign In
            </Text>
          </Pressable>
        </View>
    </KeyboardAwareScrollView>
  );
}
