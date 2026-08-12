import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { Button, EmptyState, Input, ListRow, Text } from "./base";

export type PickerItem = { id: string; title: string; subtitle?: string };

/** Full-screen searchable picker used for medicines, suppliers, patients. */
export function PickerModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
  onCreateNew,
  createLabel,
  footer,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  onCreateNew?: (searchText: string) => void;
  createLabel?: string;
  /** Optional footer rendered below the list (e.g. inline create forms). */
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text variant="subheading">{title}</Text>
          <Button title="Close" variant="ghost" compact onPress={onClose} />
        </View>
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <Input placeholder="Search" value={search} onChangeText={setSearch} autoFocus />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ListRow
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => {
                onSelect(item);
                setSearch("");
              }}
            />
          )}
          ListEmptyComponent={<EmptyState title="No matches" />}
        />
        {footer}
        {onCreateNew && !footer && (
          <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
            <Button
              title={createLabel ?? "Add new"}
              variant="secondary"
              onPress={() => {
                onCreateNew(search);
                setSearch("");
              }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

