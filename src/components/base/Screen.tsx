import React from "react";
import { View, ViewStyle } from "react-native";
import { KeyboardAwareScrollView, KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../theme/tokens";

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  keyboardOffset = 0,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  /** Extra space between the keyboard and the focused field (e.g. stack header clearance). */
  keyboardOffset?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = insets.bottom + tabBarClearance;
  const inner = padded
    ? { padding: spacing.lg, paddingBottom: bottomPad + spacing.lg }
    : { paddingBottom: bottomPad };

  if (!scroll) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
        <View style={[{ flex: 1 }, inner, style]}>{children}</View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[inner, style, { flexGrow: 1 }]}
      bottomOffset={keyboardOffset + spacing.md}
      extraKeyboardSpace={spacing.xl}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
