import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "../../components/BrandLogo";
import { Text } from "../../components/base";
import { brand } from "../../theme/brand";
import { spacing } from "../../theme/tokens";

const { width: W, height: H } = Dimensions.get("window");
const CREAM = brand.cream;
const SEEN_KEY = "eden.introSeen";

// ---------------------------------------------------------------- glass bits

function Glass({
  style,
  children,
  intensity = 24,
}: {
  style?: object;
  children?: React.ReactNode;
  intensity?: number;
}) {
  return (
    <View style={[styles.glass, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.glassTint} />
      <View style={{ padding: spacing.md }}>{children}</View>
    </View>
  );
}

/** Gently bobbing wrapper for floating elements. */
function Float({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: object;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration: 1800 + delay }),
        withTiming(0, { duration: 1800 + delay })
      ),
      -1,
      true
    );
  }, [y, delay, distance]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

function Sparkle({ x, y, size = 14, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  const o = useSharedValue(0.2);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 + delay }), withTiming(0.2, { duration: 900 + delay })),
      -1,
      true
    );
  }, [o, delay]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, anim]}>
      <Ionicons name="sparkles" size={size} color="rgba(245,242,233,0.8)" />
    </Animated.View>
  );
}

// ---------------------------------------------------------------- slide scenes

function StockScene() {
  return (
    <View style={styles.scene}>
      <Sparkle x={30} y={10} delay={0} />
      <Sparkle x={W - 90} y={60} size={18} delay={300} />
      <Sparkle x={50} y={220} size={10} delay={600} />

      <Float delay={0} style={{ transform: [{ rotate: "-4deg" }] }}>
        <Glass style={{ width: W * 0.66 }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.glassTitle}>Paracetamol 500</Text>
              <Text style={styles.glassSub}>Batch A22 · Exp 2027-04</Text>
            </View>
            <View style={styles.qtyPill}>
              <Text style={styles.qtyText}>240</Text>
            </View>
          </View>
        </Glass>
      </Float>

      <Float delay={250} distance={14} style={{ alignSelf: "flex-end", marginTop: spacing.lg, transform: [{ rotate: "3deg" }] }}>
        <Glass style={{ width: W * 0.6 }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.glassTitle}>Amoxicillin 250</Text>
              <Text style={styles.glassSub}>2 batches</Text>
            </View>
            <View style={[styles.qtyPill, { backgroundColor: "rgba(255,196,120,0.9)" }]}>
              <Text style={[styles.qtyText, { color: brand.navyDark }]}>Low · 8</Text>
            </View>
          </View>
        </Glass>
      </Float>

      <Float delay={500} style={{ marginTop: spacing.lg, transform: [{ rotate: "-2deg" }] }}>
        <Glass style={{ width: W * 0.5 }}>
          <View style={styles.rowBetween}>
            <Ionicons name="cube" size={20} color={CREAM} />
            <Text style={styles.glassTitle}>1,284 units tracked</Text>
          </View>
        </Glass>
      </Float>
    </View>
  );
}

function DuesScene() {
  return (
    <View style={[styles.scene, { alignItems: "center" }]}>
      <Sparkle x={40} y={30} delay={200} />
      <Sparkle x={W - 100} y={0} size={18} delay={0} />
      <Sparkle x={W - 70} y={230} size={12} delay={500} />

      <Float distance={12}>
        <View style={styles.ring}>
          <View style={styles.ringInner}>
            <Text style={{ color: CREAM, fontSize: 40, fontWeight: "800", includeFontPadding: false, lineHeight: 44 }}>18</Text>
            <Text style={{ color: "rgba(245,242,233,0.8)", fontSize: 13, fontWeight: "600" }}>days left</Text>
          </View>
        </View>
      </Float>

      <Float delay={300} style={{ marginTop: spacing.xl, alignSelf: "flex-start", marginLeft: spacing.lg, transform: [{ rotate: "-3deg" }] }}>
        <Glass style={{ width: W * 0.62 }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.glassTitle}>₹12,400 · MedPlus</Text>
              <Text style={styles.glassSub}>Inv 4417 · 50 days credit</Text>
            </View>
            <View style={styles.callChip}>
              <Ionicons name="call" size={16} color={brand.navyDark} />
            </View>
          </View>
        </Glass>
      </Float>

      <Float delay={550} style={{ marginTop: spacing.md, alignSelf: "flex-end", marginRight: spacing.lg, transform: [{ rotate: "2deg" }] }}>
        <Glass style={{ width: W * 0.66 }}>
          <View style={styles.rowBetween}>
            <Ionicons name="notifications" size={18} color={CREAM} />
            <Text style={styles.glassSub}>Reminded 10 · 5 · 1 days before</Text>
          </View>
        </Glass>
      </Float>
    </View>
  );
}

function RxScene() {
  return (
    <View style={[styles.scene, { alignItems: "center" }]}>
      <Sparkle x={30} y={40} delay={100} />
      <Sparkle x={W - 80} y={20} size={16} delay={400} />

      <Float distance={8}>
        <Glass style={{ width: W * 0.7 }} intensity={30}>
          <Text style={{ color: CREAM, fontWeight: "800", fontSize: 18, marginBottom: 6 }}>℞</Text>
          <View style={styles.rxLine}>
            <Text style={styles.glassTitle}>1. Paracetamol 500</Text>
            <Text style={styles.glassSub}>1-0-1 · after food · 5 days</Text>
          </View>
          <View style={styles.rxLine}>
            <Text style={styles.glassTitle}>2. Cetirizine 10</Text>
            <Text style={styles.glassSub}>0-0-1 · 3 days</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
            <Text style={styles.glassSub}>Total</Text>
            <Text style={styles.glassTitle}>₹185</Text>
          </View>
        </Glass>
      </Float>

      <Float delay={350} style={{ marginTop: spacing.xl, transform: [{ rotate: "-2deg" }] }}>
        <Glass style={{ width: W * 0.52 }}>
          <View style={styles.rowBetween}>
            <Ionicons name="print" size={20} color={CREAM} />
            <Text style={styles.glassTitle}>Printing… done in 2s</Text>
          </View>
        </Glass>
      </Float>
    </View>
  );
}

// ------------------------------------------------------------------- slides

const SLIDES = [
  {
    key: "stock",
    gradient: [brand.navyMid, brand.navyDark] as const,
    Scene: StockScene,
    title: "Every tablet,\ncounted.",
    body: "Batches, expiry dates and low-stock alerts - your whole pharmacy in your pocket.",
  },
  {
    key: "dues",
    gradient: [brand.navyDark, "#060D18"] as const,
    Scene: DuesScene,
    title: "Never miss a\nrep payment.",
    body: "Track every credit period and get reminded before the rep arrives.",
  },
  {
    key: "rx",
    gradient: [brand.navy, brand.navyMid] as const,
    Scene: RxScene,
    title: "Prescribe.\nPrint. Done.",
    body: "Stock-aware prescriptions on your thermal printer - stock updates itself.",
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const listRef = useRef<Animated.FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);

  const { replay } = useLocalSearchParams<{ replay?: string }>();

  useEffect(() => {
    if (replay === "1") return;
    AsyncStorage.getItem(SEEN_KEY).then((v) => {
      if (v === "1") router.replace("/(auth)/sign-in");
    });
  }, [replay]);

  const finish = () => {
    AsyncStorage.setItem(SEEN_KEY, "1").catch(() => { });
    router.replace("/(auth)/sign-in");
  };

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const next = () => {
    if (index >= SLIDES.length - 1) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: brand.navyDark }}>
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item, index: i }) => {
          const Scene = item.Scene;
          return (
            <View style={{ width: W, flex: 1 }}>
              <LinearGradient colors={item.gradient} style={StyleSheet.absoluteFill} />
              <Ionicons
                name="medical"
                size={H * 0.55}
                color="rgba(255,255,255,0.04)"
                style={{ position: "absolute", right: -W * 0.3, top: -40, transform: [{ rotate: "20deg" }] }}
              />
              <SlideContent scene={<Scene />} title={item.title} body={item.body} i={i} scrollX={scrollX} topInset={insets.top} />
            </View>
          );
        }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + spacing.md }]}>
        <BrandLogo size="sm" useDefault />
        <Pressable onPress={finish} hitSlop={10} style={styles.skip}>
          <Text style={{ color: "rgba(245,242,233,0.85)", fontWeight: "600", fontSize: 13 }}>Skip</Text>
        </Pressable>
      </View>

      {/* Bottom bar: dots + next */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} scrollX={scrollX} />
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [styles.nextBtn, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <View style={styles.nextInner}>
            <Ionicons name={index === SLIDES.length - 1 ? "checkmark" : "arrow-forward"} size={24} color={brand.navyDark} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function SlideContent({
  scene,
  title,
  body,
  i,
  scrollX,
  topInset,
}: {
  scene: React.ReactNode;
  title: string;
  body: string;
  i: number;
  scrollX: SharedValue<number>;
  topInset: number;
}) {
  const range = [(i - 1) * W, i * W, (i + 1) * W];

  const sceneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(scrollX.value, range, [W * 0.4, 0, -W * 0.4], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(scrollX.value, range, [W * 0.2, 0, -W * 0.2], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1, paddingTop: topInset + 80 }}>
      <Animated.View style={[{ flex: 1, justifyContent: "center" }, sceneStyle]}>{scene}</Animated.View>
      <Animated.View style={[{ paddingHorizontal: spacing.xl, paddingBottom: 140 }, textStyle]}>
        <Text style={{ color: CREAM, fontSize: 34, fontWeight: "800", lineHeight: 40 }}>{title}</Text>
        <Text style={{ color: "rgba(245,242,233,0.75)", fontSize: 15, lineHeight: 22, marginTop: spacing.md }}>
          {body}
        </Text>
      </Animated.View>
    </View>
  );
}

function Dot({ i, scrollX }: { i: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const range = [(i - 1) * W, i * W, (i + 1) * W];
    return {
      width: interpolate(scrollX.value, range, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, range, [0.4, 1, 0.4], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  scene: { paddingHorizontal: spacing.xl },
  glass: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  glassTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  glassTitle: { color: CREAM, fontWeight: "700", fontSize: 15 },
  glassSub: { color: "rgba(245,242,233,0.7)", fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  qtyPill: {
    backgroundColor: "rgba(245,242,233,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  qtyText: { color: brand.navyDark, fontWeight: "800", fontSize: 13 },
  callChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(245,242,233,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 10,
    borderColor: "rgba(245,242,233,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  rxLine: { marginBottom: spacing.sm },
  topBar: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: { height: 8, borderRadius: 4, backgroundColor: brand.goldLight },
  nextBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(212,175,55,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: brand.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
