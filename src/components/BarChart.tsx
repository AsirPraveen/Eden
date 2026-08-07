import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { radius, shadow, spacing } from "../theme/tokens";
import { Text } from "./base";

export type BarDatum = { label: string; value: number; secondary?: number; tertiary?: number };

type Series = "primary" | "secondary" | "tertiary";

type ActiveBar = {
  index: number;
  series: Series;
  x: number;
  y: number;
  label: string;
  amount: number;
};

/**
 * Bar chart - grouped (side-by-side) or stacked dual series, with touch tooltips.
 */
export function BarChart({
  data,
  height = 160,
  formatValue,
  primaryName,
  secondaryName,
  tertiaryName,
  variant = "stacked",
}: {
  data: BarDatum[];
  height?: number;
  formatValue?: (n: number) => string;
  primaryName?: string;
  secondaryName?: string;
  tertiaryName?: string;
  variant?: "stacked" | "grouped";
}) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = React.useState(0);
  const [active, setActive] = React.useState<ActiveBar | null>(null);
  const fmt = formatValue ?? ((n: number) => String(n));

  if (data.length === 0) return null;

  const hasSecondary = data.some((d) => d.secondary !== undefined);
  const hasTertiary = data.some((d) => d.tertiary !== undefined);
  const max = Math.max(
    1,
    ...data.map((d) =>
      variant === "grouped"
        ? Math.max(d.value, d.secondary ?? 0, d.tertiary ?? 0)
        : d.secondary !== undefined
          ? d.value + d.secondary
          : d.value
    )
  );
  const chartH = height - 24;
  const secondaryColor = "#3b82f6";
  const tertiaryColor = "#2D6A3E";

  const selectBar = (bar: ActiveBar) => {
    setActive((prev) =>
      prev?.index === bar.index && prev.series === bar.series ? null : bar
    );
  };

  const renderTooltip = () => {
    if (!active) return null;
    const seriesLabel =
      active.series === "primary" ? primaryName : active.series === "secondary" ? secondaryName : tertiaryName;
    const tooltipW = 112;
    const left = Math.min(Math.max(active.x - tooltipW / 2, 4), width - tooltipW - 4);
    const top = Math.max(active.y - 52, 4);

    return (
      <View
        pointerEvents="none"
        style={[
          styles.tooltip,
          {
            left,
            top,
            width: tooltipW,
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            ...(scheme === "light" ? shadow.card : {}),
          },
        ]}
      >
        <Text variant="caption" style={{ fontWeight: "700", textAlign: "center" }}>
          {active.label}
        </Text>
        {seriesLabel ? (
          <Text variant="caption" color={colors.textSecondary} style={{ textAlign: "center", marginTop: 2 }}>
            {seriesLabel}
          </Text>
        ) : null}
        <Text variant="body" style={{ fontWeight: "700", textAlign: "center", marginTop: 2 }}>
          {fmt(active.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ position: "relative" }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {(primaryName || secondaryName || tertiaryName) && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm }}>
            {primaryName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.accent }} />
                <Text variant="caption">{primaryName}</Text>
              </View>
            ) : null}
            {secondaryName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: secondaryColor }} />
                <Text variant="caption">{secondaryName}</Text>
              </View>
            ) : null}
            {tertiaryName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: tertiaryColor }} />
                <Text variant="caption">{tertiaryName}</Text>
              </View>
            ) : null}
          </View>
        )}
        {width > 0 && (
          <View style={{ height, position: "relative" }}>
            {active ? (
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setActive(null)} />
            ) : null}
            {renderTooltip()}
            <Svg width={width} height={height}>
              {data.map((d, i) => {
                const slot = width / data.length;
                const hPrimary = Math.max(0, (d.value / max) * (chartH - 8));
                const hSecondary = d.secondary !== undefined ? Math.max(0, (d.secondary / max) * (chartH - 8)) : 0;
                const hTertiary = d.tertiary !== undefined ? Math.max(0, (d.tertiary / max) * (chartH - 8)) : 0;

                if (variant === "grouped" && hasSecondary) {
                  const barCount = hasTertiary ? 3 : 2;
                  const barW = Math.min(hasTertiary ? 10 : 14, slot / (barCount + 2));
                  const gap = 3;
                  const cx = i * slot + slot / 2;
                  const groupW = barCount * barW + (barCount - 1) * gap;
                  const xPrimary = cx - groupW / 2;
                  const xSecondary = xPrimary + barW + gap;
                  const xTertiary = xSecondary + barW + gap;
                  const yPrimary = chartH - hPrimary;
                  const ySecondary = chartH - hSecondary;
                  const yTertiary = chartH - hTertiary;
                  return (
                    <React.Fragment key={d.label + i}>
                      <Rect
                        x={xPrimary}
                        y={yPrimary}
                        width={barW}
                        height={Math.max(hPrimary, 4)}
                        rx={2}
                        fill={colors.accent}
                        opacity={active?.index === i && active.series === "primary" ? 1 : 0.88}
                        onPress={() =>
                          selectBar({
                            index: i,
                            series: "primary",
                            x: xPrimary + barW / 2,
                            y: yPrimary,
                            label: d.label,
                            amount: d.value,
                          })
                        }
                      />
                      <Rect
                        x={xSecondary}
                        y={ySecondary}
                        width={barW}
                        height={Math.max(hSecondary, 4)}
                        rx={2}
                        fill={secondaryColor}
                        opacity={active?.index === i && active.series === "secondary" ? 1 : 0.88}
                        onPress={() =>
                          selectBar({
                            index: i,
                            series: "secondary",
                            x: xSecondary + barW / 2,
                            y: ySecondary,
                            label: d.label,
                            amount: d.secondary ?? 0,
                          })
                        }
                      />
                      {hasTertiary ? (
                        <Rect
                          x={xTertiary}
                          y={yTertiary}
                          width={barW}
                          height={Math.max(hTertiary, 4)}
                          rx={2}
                          fill={tertiaryColor}
                          opacity={active?.index === i && active.series === "tertiary" ? 1 : 0.88}
                          onPress={() =>
                            selectBar({
                              index: i,
                              series: "tertiary",
                              x: xTertiary + barW / 2,
                              y: yTertiary,
                              label: d.label,
                              amount: d.tertiary ?? 0,
                            })
                          }
                        />
                      ) : null}
                      <SvgText x={cx} y={height - 6} fontSize={10} fill={colors.textSecondary} textAnchor="middle">
                        {d.label}
                      </SvgText>
                    </React.Fragment>
                  );
                }

                const barW = Math.min(22, slot / 2.2);
                const x0 = i * slot + slot / 2 - barW / 2;
                const yStackedPrimary = chartH - (hPrimary + hSecondary);
                const yStackedSecondary = chartH - hSecondary;
                const ySingle = chartH - hPrimary;

                return (
                  <React.Fragment key={d.label + i}>
                    {hasSecondary ? (
                      <>
                        <Rect
                          x={x0}
                          y={yStackedPrimary}
                          width={barW}
                          height={Math.max(hPrimary, 4)}
                          rx={2}
                          fill={colors.accent}
                          opacity={active?.index === i && active.series === "primary" ? 1 : 0.88}
                          onPress={() =>
                            selectBar({
                              index: i,
                              series: "primary",
                              x: x0 + barW / 2,
                              y: yStackedPrimary,
                              label: d.label,
                              amount: d.value,
                            })
                          }
                        />
                        <Rect
                          x={x0}
                          y={yStackedSecondary}
                          width={barW}
                          height={Math.max(hSecondary, 4)}
                          rx={2}
                          fill={secondaryColor}
                          opacity={active?.index === i && active.series === "secondary" ? 1 : 0.88}
                          onPress={() =>
                            selectBar({
                              index: i,
                              series: "secondary",
                              x: x0 + barW / 2,
                              y: yStackedSecondary,
                              label: d.label,
                              amount: d.secondary ?? 0,
                            })
                          }
                        />
                      </>
                    ) : (
                      <Rect
                        x={x0}
                        y={ySingle}
                        width={barW}
                        height={Math.max(hPrimary, 4)}
                        rx={2}
                        fill={colors.accent}
                        opacity={active?.index === i && active.series === "primary" ? 1 : 0.88}
                        onPress={() =>
                          selectBar({
                            index: i,
                            series: "primary",
                            x: x0 + barW / 2,
                            y: ySingle,
                            label: d.label,
                            amount: d.value,
                          })
                        }
                      />
                    )}
                    <SvgText x={i * slot + slot / 2} y={height - 6} fontSize={10} fill={colors.textSecondary} textAnchor="middle">
                      {d.label}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        )}
        {formatValue && (
          <Text variant="caption" style={{ marginTop: 2 }}>
            Peak {formatValue(max)} · tap a bar for details
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    zIndex: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
