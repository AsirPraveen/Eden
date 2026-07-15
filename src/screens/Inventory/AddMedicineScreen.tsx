import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { MEDICINE_CATEGORIES } from '../../utils/constants';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function AddMedicineScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tablets');
  const [manufacturer, setManufacturer] = useState('');
  const [unit, setUnit] = useState('strip');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [sellingPrice, setSellingPrice] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a medicine name.');
      return;
    }
    if (!activeClinic?.id) {
      Alert.alert('Error', 'No clinic selected.');
      return;
    }

    try {
      setSaving(true);
      const medRef = doc(collection(db, 'clinics', activeClinic.id, 'medicines'));

      await setDoc(medRef, {
        name: name.trim(),
        category,
        manufacturer: manufacturer.trim(),
        unit: unit.trim() || 'strip',
        currentStock: 0,
        reorderLevel: parseInt(reorderLevel) || 10,
        avgPurchasePrice: 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      Alert.alert('Success', `${name.trim()} added to inventory.`, [
        { text: 'Add Another', onPress: () => resetForm() },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add medicine.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setManufacturer('');
    setSellingPrice('');
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    opts: { placeholder?: string; keyboardType?: any; required?: boolean } = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {opts.required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={opts.placeholder}
        placeholderTextColor={colors.textSecondary + '80'}
        keyboardType={opts.keyboardType || 'default'}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Medicine</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '15' }]}>
          <Package size={28} color={colors.secondary} />
        </View>

        {renderInput('Medicine Name', name, setName, { placeholder: 'e.g., Paracetamol 500mg', required: true })}

        {/* Category Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowCategories(!showCategories)}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>{category}</Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {showCategories && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {MEDICINE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    cat === category && { backgroundColor: colors.secondary + '15' },
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategories(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    { color: cat === category ? colors.secondary : colors.text },
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {renderInput('Manufacturer', manufacturer, setManufacturer, { placeholder: 'e.g., Cipla, Sun Pharma' })}
        {renderInput('Unit', unit, setUnit, { placeholder: 'strip, bottle, box, vial' })}
        {renderInput('Reorder Level', reorderLevel, setReorderLevel, { placeholder: '10', keyboardType: 'numeric' })}
        {renderInput('Selling Price (₹)', sellingPrice, setSellingPrice, { placeholder: '0.00', keyboardType: 'decimal-pad' })}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Add Medicine</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  dropdown: {
    height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownText: { fontSize: 15 },
  dropdownList: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { fontSize: 14 },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
