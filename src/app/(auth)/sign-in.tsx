import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthField } from "../../components/AuthField";
import { Button, Text } from "../../components/base";
import { friendlyAuthError, resetPassword, signIn } from "../../services/auth";
import { isFirebaseConfigured } from "../../services/firebase";
import { syncSessionForUser } from "../../stores/useSession";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../utils/formErrors";

type SignInField = "email" | "password" | "_form";

export default function SignIn() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<SignInField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: FieldErrors<SignInField> = {};
    if (!email.trim()) next.email = "Enter your email.";
    if (!password) next.password = "Enter your password.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      const cred = await signIn(email, password);
      const accountId = await syncSessionForUser(cred.user);
      router.replace(accountId ? "/(app)/home" : "/(auth)/onboarding");
    } catch (e) {
      setErrors({ _form: friendlyAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setErrors({ email: "Enter your email first, then tap Forgot password." });
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    try {
      await resetPassword(email);
      Alert.alert("Password reset", "A reset link has been sent to your email.");
    } catch (e) {
      setErrors({ _form: friendlyAuthError(e) });
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        flexGrow: 1,
      }}
      bottomOffset={spacing.md}
      extraKeyboardSpace={spacing.lg}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
        <Image
          source={require("../../../assets/images/icon.png")}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 1.5,
            borderColor: colors.border,
            overflow: "hidden",
            resizeMode: "cover",
          }}
        />
        <Text
          style={{
            marginTop: 8,
            fontSize: 18,
            fontWeight: "700",
            color: colors.accent,
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          Eden
        </Text>
      </View>

      <Text variant="title" style={{ textAlign: "center" }}>
        Welcome Back!
      </Text>
      <Text variant="secondary" style={{ textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl }}>
        Glad to see you again, Doctor
      </Text>

      {!isFirebaseConfigured && (
        <Text variant="caption" color={colors.danger} style={{ marginBottom: spacing.lg, textAlign: "center" }}>
          Firebase is not configured yet - see docs/FIREBASE_SETUP.md.
        </Text>
      )}

      <AuthField
        icon="mail-outline"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErrors((e) => withoutField(e, "email"));
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
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
        placeholder="Password"
        error={errors.password ?? errors._form}
      />

      <Pressable onPress={forgot} style={{ alignSelf: "flex-end", padding: spacing.xs, marginBottom: spacing.lg }}>
        <Text variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>
          Forgot password?
        </Text>
      </Pressable>

      <Button title="Sign In" onPress={submit} loading={busy} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, gap: 6 }}>
        <Text variant="secondary">Don{"'"}t have an account?</Text>
        <Pressable onPress={() => router.push("/(auth)/sign-up")} hitSlop={8}>
          <Text variant="body" color={colors.accent} style={{ fontWeight: "700" }}>
            Sign Up
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: "/(auth)/welcome", params: { replay: "1" } })}
        style={{ alignSelf: "center", marginTop: spacing.lg, padding: spacing.xs }}
        hitSlop={8}
      >
        <Text variant="caption" color={colors.textSecondary}>
          See what the app can do
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}
