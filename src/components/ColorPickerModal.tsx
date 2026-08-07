import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Modal, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Text } from "./base";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { hexToHsl, hslToHex } from "../utils/color";

type Props = {
  visible: boolean;
  title: string;
  value: string | null;
  fallback?: string;
  onClose: () => void;
  onSelect: (hex: string) => void;
};

function pickColor(x: number, y: number, width: number, height: number, hue: number): string {
  const s = Math.max(0, Math.min(100, (x / width) * 100));
  const l = Math.max(0, Math.min(100, 100 - (y / height) * 100));
  return hslToHex(hue, s, l);
}

export function ColorPickerModal({ visible, title, value, fallback = "#0F2240", onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const initial = value ?? fallback;
  const [hue, setHue] = useState(hexToHsl(initial).h);
  const [color, setColor] = useState(initial);
  const [areaSize, setAreaSize] = useState({ w: 1, h: 1 });
  const [hueWidth, setHueWidth] = useState(1);

  useEffect(() => {
    if (!visible) return;
    const next = value ?? fallback;
    setColor(next);
    setHue(hexToHsl(next).h);
  }, [visible, value, fallback]);

  const onAreaPress = (x: number, y: number) => {
    const next = pickColor(x, y, areaSize.w, areaSize.h, hue);
    setColor(next);
  };

  const onHuePress = (x: number) => {
    const nextHue = Math.max(0, Math.min(360, (x / hueWidth) * 360));
    setHue(nextHue);
    const { s, l } = hexToHsl(color);
    setColor(hslToHex(nextHue, s, l));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: spacing.lg,
            paddingBottom: spacing.xl,
          }}
        >
          <Text variant="subheading" style={{ marginBottom: spacing.md }}>
            {title}
          </Text>

          <View
            style={{
              height: 44,
              borderRadius: radius.md,
              backgroundColor: color,
              marginBottom: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />

          <Pressable
            onLayout={(e: LayoutChangeEvent) => {
              const { width, height } = e.nativeEvent.layout;
              setAreaSize({ w: width, h: height });
            }}
            onPress={(e) => onAreaPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            style={{ height: 180, borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.md }}
          >
            <View style={{ flex: 1, backgroundColor: hslToHex(hue, 100, 50) }}>
              <LinearGradient colors={["#FFFFFF", "transparent"]} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <LinearGradient
                colors={["transparent", "#000000"]}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </View>
          </Pressable>

          <Pressable
            onLayout={(e: LayoutChangeEvent) => setHueWidth(e.nativeEvent.layout.width)}
            onPress={(e) => onHuePress(e.nativeEvent.locationX)}
            style={{ height: 28, borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.lg }}
          >
            <LinearGradient
              colors={["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FF0000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Pressable>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title="Use color"
              onPress={() => {
                onSelect(color);
                onClose();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
