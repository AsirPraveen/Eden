import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { Text } from "./base";
import { formatDate } from "../utils/format";

type Props = {
  label?: string;
  required?: boolean;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  containerStyle?: object;
};

/** Tappable date field that opens the native calendar picker. */
export function DatePickerField({
  label,
  required,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Select date",
  containerStyle,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") return;
    if (selected) onChange(selected);
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
            {value ? formatDate(value) : placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        </View>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
