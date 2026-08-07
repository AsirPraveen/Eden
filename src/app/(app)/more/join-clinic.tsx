import React, { useState } from "react";
import { Alert } from "react-native";
import { router, Stack } from "expo-router";
import { Button, Card, Input, Screen, Text } from "../../../components/base";
import { joinWithInvite } from "../../../services/auth";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";
import { EMPTY_FIELD_ERRORS, FieldErrors, withoutField } from "../../../utils/formErrors";

type JoinField = "code" | "_form";

export default function JoinClinic() {
  const { colors } = useTheme();
  const { user, refreshAccount } = useSession();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors<JoinField>>(EMPTY_FIELD_ERRORS);
  const [busy, setBusy] = useState(false);

  const handleJoin = async () => {
    if (!user) return;
    if (!code.trim()) {
      setErrors({ code: "Enter the invite code." });
      return;
    }
    setErrors(EMPTY_FIELD_ERRORS);
    setBusy(true);
    try {
      await joinWithInvite(user, code);
      await refreshAccount();
      Alert.alert("Success!", "You have joined the new clinic. Switch to it anytime from the top bar.", [
        { text: "OK", onPress: () => router.replace("/(app)/home") },
      ]);
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Join Clinic" }} />
      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="subheading" style={{ marginBottom: spacing.xs }}>
          Enter Invite Code
        </Text>
        <Text variant="caption" style={{ marginBottom: spacing.md }} color={colors.textSecondary}>
          If another doctor or clinic owner invited you, enter the 6-character code below to join their practice.
        </Text>

        <Input
          label="Invite code"
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setErrors((e) => withoutField(e, "code"));
          }}
          placeholder="e.g. AB12CD"
          autoCapitalize="characters"
          autoCorrect={false}
          error={errors.code ?? errors._form}
        />

        <Button title="Join Clinic" onPress={handleJoin} loading={busy} />
      </Card>
    </Screen>
  );
}
