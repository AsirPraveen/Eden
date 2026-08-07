import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { Text } from "./base";
import { formatMonthYear, parseMonthYear } from "../utils/format";

type Props = {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (monthYear: string) => void;
  placeholder?: string;
  containerStyle?: object;
};

/** Month/year picker for batch expiry (stores YYYY-MM). */
export function MonthPickerField({
  label,
  required,
  value,
  onChange,
  placeholder = "Select expiry",
  containerStyle,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const pickerDate = parseMonthYear(value) ?? new Date();

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") return;
    if (selected) onChange(formatMonthYear(selected));
  };

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label ? (
        <View style={{ flexDirection: "row", marginBottom: spacing.xs }}>
          <Text variant="caption">{label}</Text>
          {required ? (
            <Text variant="caption" color={colors.danger}>
              {" *"}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Pressable onPress={() => setOpen(true)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.inputBackground,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            minHeight: 46,
          }}
        >
          <Text variant="body" color={value ? colors.text : colors.placeholder}>
            {value || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        </View>
      </Pressable>
      {open && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Pressable onPress={() => setOpen(false)} style={{ alignSelf: "flex-end", paddingVertical: spacing.sm }}>
          <Text variant="body" color={colors.accent} style={{ fontWeight: "600" }}>
            Done
          </Text>
        </Pressable>
      )}
    </View>
  );
}
