import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Handshake } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function AddRepScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visitDay, setVisitDay] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !company.trim()) {
      Alert.alert('Error', 'Rep name and company are required.');
      return;
    }
    if (!activeClinic?.id) return;

    try {
      setSaving(true);
      const repRef = doc(collection(db, 'clinics', activeClinic.id, 'reps'));

      await setDoc(repRef, {
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim(),
        visitDay: visitDay.trim(),
        notes: notes.trim(),
        totalPurchases: 0,
        totalOutstanding: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', `${name.trim()} from ${company.trim()} added.`, [
        { text: 'Add Another', onPress: () => { setName(''); setCompany(''); setPhone(''); } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add rep.');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string, value: string, onChangeText: (t: string) => void,
    opts: { placeholder?: string; keyboardType?: any; required?: boolean; multiline?: boolean } = {}
  ) => {
    const isFocused = focusedField === label;
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}{opts.required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
            opts.multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 },
            isFocused && {
              borderColor: colors.secondary,
              shadowColor: colors.secondary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={opts.placeholder}
          placeholderTextColor={colors.textSecondary + '80'}
          keyboardType={opts.keyboardType || 'default'}
          multiline={opts.multiline}
          onFocus={() => setFocusedField(label)}
          onBlur={() => setFocusedField(null)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Medical Rep</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
          <Handshake size={28} color={colors.accent} />
        </View>

        {renderInput('Rep Name', name, setName, { placeholder: 'Full name', required: true })}
        {renderInput('Company', company, setCompany, { placeholder: 'Pharmaceutical company', required: true })}
        {renderInput('Phone', phone, setPhone, { placeholder: '9876543210', keyboardType: 'phone-pad' })}
        {renderInput('Email', email, setEmail, { placeholder: 'rep@company.com', keyboardType: 'email-address' })}
        {renderInput('Visit Day / Schedule', visitDay, setVisitDay, { placeholder: 'e.g., Every Monday, 1st & 3rd week' })}
        {renderInput('Notes', notes, setNotes, { placeholder: 'Any additional notes', multiline: true })}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={styles.saveBtnText}>Add Medical Rep</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
