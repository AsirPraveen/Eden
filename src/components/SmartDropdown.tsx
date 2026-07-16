import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, Dimensions,
} from 'react-native';
import { Search, Plus, X, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

type SmartDropdownProps = {
  data: any[];
  labelKey: string;
  subtitleKey?: string;
  onSelect: (item: any) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  placeholder?: string;
  selectedValue?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export default function SmartDropdown({
  data,
  labelKey,
  subtitleKey,
  onSelect,
  onAddNew,
  addNewLabel = 'Add New',
  placeholder = 'Select...',
  selectedValue,
  icon,
  disabled = false,
}: SmartDropdownProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) => {
      const label = (item[labelKey] || '').toLowerCase();
      const subtitle = subtitleKey ? (item[subtitleKey] || '').toLowerCase() : '';
      return label.includes(q) || subtitle.includes(q);
    });
  }, [data, searchQuery, labelKey, subtitleKey]);

  const handleSelect = (item: any) => {
    onSelect(item);
    setVisible(false);
    setSearchQuery('');
  };

  const handleAddNew = () => {
    setVisible(false);
    setSearchQuery('');
    onAddNew?.();
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
          },
          disabled && { opacity: 0.65 },
        ]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {icon && <View style={styles.triggerIcon}>{icon}</View>}
        <Text
          style={[
            styles.triggerText,
            { color: selectedValue ? colors.text : colors.textSecondary + '80' },
          ]}
          numberOfLines={1}
        >
          {selectedValue || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => { setVisible(false); setSearchQuery(''); }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search..."
                placeholderTextColor={colors.textSecondary + '80'}
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Add New button */}
            {onAddNew && (
              <TouchableOpacity
                style={[styles.addNewBtn, { backgroundColor: colors.secondary + '12' }]}
                onPress={handleAddNew}
              >
                <Plus size={18} color={colors.secondary} />
                <Text style={[styles.addNewText, { color: colors.secondary }]}>{addNewLabel}</Text>
              </TouchableOpacity>
            )}

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => item.id || String(idx)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    { borderBottomColor: colors.divider },
                    selectedValue === item[labelKey] && { backgroundColor: colors.secondary + '08' },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.listItemContent}>
                    <Text style={[styles.listItemLabel, { color: colors.text }]}>
                      {item[labelKey]}
                    </Text>
                    {subtitleKey && item[subtitleKey] ? (
                      <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                        {item[subtitleKey]}
                      </Text>
                    ) : null}
                  </View>
                  {selectedValue === item[labelKey] && (
                    <View style={[styles.selectedDot, { backgroundColor: colors.secondary }]} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery ? 'No results found' : 'No items available'}
                </Text>
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger button
  trigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerIcon: {
    marginRight: 10,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Add New
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  addNewText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // List
  listItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 1,
  },
  listItemSubtitle: {
    fontSize: 12,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
