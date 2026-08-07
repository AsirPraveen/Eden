import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { radius, shadow, spacing } from "../theme/tokens";
import { Text } from "./base";
// Minimal local shape of expo-router's tab bar props - avoids depending on
// @react-navigation/bottom-tabs directly, whose bundled types can drift from
// the version expo-router uses internally. Kept loose on purpose.
type BottomTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit: (e: any) => any;
    navigate: (name: string) => void;
  };
};

const ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  home: { outline: "home-outline", filled: "home" },
  stock: { outline: "cube-outline", filled: "cube" },
  patients: { outline: "people-outline", filled: "people" },
  dues: { outline: "card-outline", filled: "card" },
  more: { outline: "ellipsis-horizontal-outline", filled: "ellipsis-horizontal" },
};

/** Floating pill bottom nav - active tab expands into a labeled accent pill. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }, scheme === "light" && shadow.raised]}>
        {scheme === "dark" ? null : (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        )}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const icons = ICONS[route.name] ?? ICONS.home;
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabButton
              key={route.key}
              focused={focused}
              icon={focused ? icons.filled : icons.outline}
              label={label}
              onPress={onPress}
              accent={colors.cta}
              onAccent={colors.onCta}
              muted={colors.textMuted}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  focused,
  icon,
  label,
  onPress,
  accent,
  onAccent,
  muted,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
  onAccent: string;
  muted: string;
}) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(focused ? 108 : 46, { damping: 16, stiffness: 180 }),
    backgroundColor: focused ? accent : "transparent",
  }));

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[styles.tab, style]}>
        <Ionicons name={icon} size={21} color={focused ? onAccent : muted} />
        {focused ? (
          <Text numberOfLines={1} style={{ color: onAccent, fontWeight: "700", fontSize: 12.5, marginLeft: 6 }}>
            {label}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tab: {
    height: 46,
    borderRadius: radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
  },
});
