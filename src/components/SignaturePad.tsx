import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { useTheme } from "../theme/ThemeProvider";

export type SignaturePadRef = {
  clear: () => void;
  capture: () => Promise<string>;
  isEmpty: () => boolean;
};

type Props = {
  height?: number;
};

export const SignaturePad = forwardRef<SignaturePadRef, Props>(function SignaturePad({ height = 200 }, ref) {
  const { colors } = useTheme();
  const padRef = useRef<View>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const pathsRef = useRef<string[]>([]);
  const activeRef = useRef<string | null>(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const d = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        activeRef.current = d;
        setActivePath(d);
      },
      onPanResponderMove: (evt) => {
        if (!activeRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const d = `${activeRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        activeRef.current = d;
        setActivePath(d);
      },
      onPanResponderRelease: () => {
        if (activeRef.current) {
          pathsRef.current = [...pathsRef.current, activeRef.current];
          setPaths(pathsRef.current);
        }
        activeRef.current = null;
        setActivePath(null);
      },
      onPanResponderTerminate: () => {
        activeRef.current = null;
        setActivePath(null);
      },
    })
  ).current;

  useImperativeHandle(ref, () => ({
    clear: () => {
      pathsRef.current = [];
      setPaths([]);
      setActivePath(null);
      activeRef.current = null;
    },
    isEmpty: () => pathsRef.current.length === 0 && !activeRef.current,
    capture: async () => {
      if (!padRef.current) throw new Error("Signature pad not ready.");
      return captureRef(padRef, { format: "png", quality: 1, result: "tmpfile" });
    },
  }));

  const allPaths = activePath ? [...paths, activePath] : paths;

  return (
    <View
      ref={padRef}
      collapsable={false}
      style={[styles.pad, { height, borderColor: colors.border, backgroundColor: "#fff" }]}
      {...pan.panHandlers}
    >
      <Svg width="100%" height="100%">
        {allPaths.map((d, i) => (
          <Path key={i} d={d} stroke="#111" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  pad: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
});
