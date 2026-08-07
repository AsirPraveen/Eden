import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Text } from "../../components/base";
import { BrandLogo } from "../../components/BrandLogo";
import { createAccount, joinWithInvite, signOut } from "../../services/auth";
import { auth } from "../../services/firebase";
import { useSession } from "../../stores/useSession";
import { brand } from "../../theme/brand";
import { defaultBranding } from "../../theme/branding";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, shadow, spacing } from "../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../utils/formErrors";
import { indianPhoneErrorOptional, storageIndianPhone } from "../../utils/phone";

type Mode = "choose" | "create" | "join";

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
  delay,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  delay: number;
}) {
  const { colors, scheme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <View
          style={[
            styles.optionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            scheme === "light" && shadow.card,
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={icon} size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subheading">{title}</Text>
            <Text variant="caption" style={{ marginTop: 3, lineHeight: 18 }}>
              {subtitle}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Decorative watermark for the hero area. */
function HeroWatermark() {
  return (
    <Ionicons
      name="medical"
      size={340}
      color="rgba(255,255,255,0.05)"
      style={{ position: "absolute", right: -90, top: -60, transform: [{ rotate: "18deg" }] }}
    />
  );
}

type OnboardingField = "practiceName" | "doctorName" | "clinicName" | "clinicPhone" | "inviteCode" | "_form";

export default function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user: sessionUser, initialized, accountId, refreshAccount } = useSession();
  const user = sessionUser ?? auth.currentUser;
  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<OnboardingField>>(EMPTY_FIELD_ERRORS);

  const [practiceName, setPracticeName] = useState("");
  const [doctorName, setDoctorName] = useState(user?.displayName ?? "");
  const [regNo, setRegNo] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const [inviteCode, setInviteCode] = useState("");

  if (initialized && !user) return <Redirect href="/(auth)/sign-in" />;
  if (initialized && accountId) return <Redirect href="/(app)/home" />;

  const doCreate = async () => {
    if (!user) return;
    const next: FieldErrors<OnboardingField> = {};
    if (!clinicName.trim()) next.clinicName = "Enter your clinic name.";
    const phoneErr = indianPhoneErrorOptional(clinicPhone);
    if (phoneErr) next.clinicPhone = phoneErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await createAccount({
        user,
        accountName: practiceName,
        clinicName,
        clinicAddress,
        clinicPhone: clinicPhone.trim() ? storageIndianPhone(clinicPhone) : "",
        doctorName,
        regNo,
      });
      await refreshAccount();
      router.replace("/(app)/home");
    } catch (e) {
      setErrors({ _form: (e as Error).message });
      setBusy(false);
    }
  };

  const doJoin = async () => {
    if (!user) return;
    if (!inviteCode.trim()) {
      setErrors({ inviteCode: "Enter the invite code." });
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await joinWithInvite(user, inviteCode);
      await refreshAccount();
      router.replace("/(app)/home");
    } catch (e) {
      setErrors({ _form: (e as Error).message });
      setBusy(false);
    }
  };

  if (mode === "choose") {
    return (
      <View style={{ flex: 1, backgroundColor: brand.navy }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <HeroWatermark />
          <Animated.View entering={FadeInUp.delay(150).springify().damping(18)} style={{ alignSelf: "center", marginBottom: spacing.lg }}>
            <BrandLogo size="hero" light useDefault />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(240).springify().damping(18)}>
            <Text variant="title" style={{ color: brand.cream, fontSize: 28, lineHeight: 34 }}>
              Welcome to {defaultBranding.appName}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(320).springify().damping(18)}>
            <Text style={{ color: "rgba(248,246,240,0.75)", marginTop: spacing.sm, fontSize: 14, lineHeight: 20 }}>
              Your clinic's stock, prescriptions and rep payments - in one calm place.
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(120).springify().damping(19)}
          style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.xl }]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          <Text variant="label" style={{ marginBottom: spacing.md }}>
            Get started
          </Text>
          <OptionCard
            icon="medkit-outline"
            title="Set up my practice"
            subtitle="Create your clinic and start managing stock in minutes"
            onPress={() => setMode("create")}
            delay={200}
          />
          <View style={{ height: spacing.md }} />
          <OptionCard
            icon="key-outline"
            title="I have an invite code"
            subtitle="Join a practice your colleague already set up"
            onPress={() => setMode("join")}
            delay={300}
          />
          <Pressable
            onPress={() => signOut().then(() => router.replace("/(auth)/sign-in"))}
            style={{ alignSelf: "center", marginTop: spacing.xl, padding: spacing.sm }}
          >
            <Text variant="caption" color={colors.textSecondary}>
              Sign out
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <View
      style={{
        backgroundColor: brand.navy,
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => (mode === "create" && step === 2 ? setStep(1) : (setMode("choose"), setStep(1), setErrors(EMPTY_FIELD_ERRORS)))}
        hitSlop={12}
        style={{ marginBottom: spacing.lg, alignSelf: "flex-start" }}
      >
        <Ionicons name="arrow-back" size={24} color={brand.cream} />
      </Pressable>
      <BrandLogo size="sm" light useDefault style={{ marginBottom: spacing.md }} />
      <Text variant="title" style={{ color: brand.cream }}>
        {title}
      </Text>
      <Text style={{ color: "rgba(248,246,240,0.75)", marginTop: spacing.xs, fontSize: 14 }}>{subtitle}</Text>
      {mode === "create" && (
        <View style={{ flexDirection: "row", gap: 6, marginTop: spacing.lg }}>
          <View style={[styles.progress, { backgroundColor: brand.goldLight }]} />
          <View style={[styles.progress, { backgroundColor: step === 2 ? brand.goldLight : "rgba(212,175,55,0.3)" }]} />
        </View>
      )}
    </View>
  );

  if (mode === "join") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Join a practice" subtitle="Enter the code your colleague shared" />
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={spacing.md}
          extraKeyboardSpace={spacing.lg}
        >
          <Animated.View entering={FadeInDown.delay(80)}>
            <Input
              label="Invite code"
              value={inviteCode}
              onChangeText={(v) => {
                setInviteCode(v);
                setErrors((e) => withoutField(e, "inviteCode"));
              }}
              autoCapitalize="characters"
              placeholder="K7KQZ2"
              autoFocus
              error={errors.inviteCode ?? errors._form}
              style={{ fontSize: 22, letterSpacing: 6, textAlign: "center", fontWeight: "600" }}
            />
            <Button title="Join practice" onPress={doJoin} loading={busy} />
          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={step === 1 ? "About you" : "Your first clinic"}
        subtitle={step === 1 ? "This appears on printed prescriptions" : "You can add more clinics later"}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.md}
        extraKeyboardSpace={spacing.lg}
      >
        {step === 1 ? (
          <Animated.View entering={FadeInDown.delay(80)}>
            <Input
              label="Practice name"
              required
              value={practiceName}
              onChangeText={(v) => {
                setPracticeName(v);
                setErrors((e) => withoutField(e, "practiceName"));
              }}
              placeholder="Dr. Doe's Practice"
              error={errors.practiceName}
            />
            <Input
              label="Doctor name"
              required
              value={doctorName}
              onChangeText={(v) => {
                setDoctorName(v);
                setErrors((e) => withoutField(e, "doctorName"));
              }}
              placeholder="Dr. John Doe"
              error={errors.doctorName}
            />
            <Input label="Medical registration no." value={regNo} onChangeText={setRegNo} />
            <Button
              title="Continue"
              onPress={() => {
                const next: FieldErrors<OnboardingField> = {};
                if (!practiceName.trim()) next.practiceName = "Enter a practice name.";
                if (!doctorName.trim()) next.doctorName = "Enter your name as it should appear on prescriptions.";
                if (Object.keys(next).length > 0) {
                  setErrors(next);
                  return;
                }
                setErrors(EMPTY_FIELD_ERRORS);
                setStep(2);
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(80)}>
            <Input
              label="Clinic name"
              required
              value={clinicName}
              onChangeText={(v) => {
                setClinicName(v);
                setErrors((e) => withoutField(e, "clinicName"));
              }}
              placeholder="City Clinic"
              autoFocus
              error={errors.clinicName}
            />
            <Input label="Address (printed on prescriptions)" value={clinicAddress} onChangeText={setClinicAddress} multiline />
            <Input
              label="Phone"
              value={clinicPhone}
              onChangeText={(v) => {
                setClinicPhone(v);
                setErrors((e) => withoutField(e, "clinicPhone"));
              }}
              keyboardType="phone-pad"
              error={errors.clinicPhone ?? errors._form}
            />
            <Button title="Create my practice" onPress={doCreate} loading={busy} />
          </Animated.View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: brand.navy,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginTop: -28,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { flex: 1, height: 4, borderRadius: 2 },
});
