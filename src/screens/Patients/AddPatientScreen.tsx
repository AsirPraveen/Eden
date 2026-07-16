import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { BLOOD_GROUPS } from '../../utils/constants';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function AddPatientScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Patient name is required.');
      return;
    }
    if (!activeClinic?.id) return;

    try {
      setSaving(true);
      const patientRef = doc(collection(db, 'clinics', activeClinic.id, 'patients'));

      await setDoc(patientRef, {
        name: name.trim(),
        phone: phone.trim(),
        age: age ? parseInt(age) : null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
        allergies: allergies.trim() || null,
        medicalHistory: null,
        notes: notes.trim() || null,
        visitCount: 0,
        lastVisit: null,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', `${name.trim()} added as a patient.`, [
        { text: 'Add Another', onPress: () => { setName(''); setPhone(''); setAge(''); } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add patient.');
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

  const genderOptions = ['Male', 'Female', 'Other'] as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tint + '15' }]}>
          <UserPlus size={28} color={colors.tint} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Basic Info</Text>
        {renderInput('Patient Name', name, setName, { placeholder: 'Full name', required: true })}
        {renderInput('Phone', phone, setPhone, { placeholder: '9876543210', keyboardType: 'phone-pad' })}

        <View style={styles.row}>
          <View style={styles.half}>
            {renderInput('Age', age, setAge, { placeholder: 'Years', keyboardType: 'numeric' })}
          </View>
          <View style={styles.half}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
              <View style={styles.chipRow}>
                {genderOptions.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      gender === g && { backgroundColor: colors.secondary + '20', borderColor: colors.secondary },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.chipText, { color: gender === g ? colors.secondary : colors.textSecondary }]}>
                      {g.charAt(0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Optional Details</Text>

        {/* Blood Group Chips */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Blood Group</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                style={[
                  styles.bgChip,
                  { borderColor: colors.border },
                  bloodGroup === bg && { backgroundColor: colors.danger + '15', borderColor: colors.danger },
                ]}
                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
              >
                <Text style={[styles.bgChipText, { color: bloodGroup === bg ? colors.danger : colors.textSecondary }]}>
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderInput('Allergies', allergies, setAllergies, { placeholder: 'Known allergies (comma separated)' })}
        {renderInput('Notes', notes, setNotes, { placeholder: 'Any additional notes', multiline: true })}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={styles.saveBtnText}>Add Patient</Text>
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
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  bloodGroupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bgChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  bgChipText: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 20 },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
