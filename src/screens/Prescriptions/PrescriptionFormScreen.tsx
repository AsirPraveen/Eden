import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Plus, Trash2, Search, Printer, X, UserPlus,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { DOSAGE_OPTIONS, DOSAGE_TIMINGS } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';
import {
  collection, getDocs, doc, setDoc, updateDoc, increment,
  serverTimestamp, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

type RxItem = {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  timing: string;
  duration: number;
  instructions: string;
  unitPrice: number;
  amount: number;
};

export default function PrescriptionFormScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { activeClinic } = useClinic();

  // Patient
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientId, setPatientId] = useState(route?.params?.patientId || '');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  // Medicines
  const [items, setItems] = useState<RxItem[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Modals
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeClinic?.id) {
      fetchMedicines();
      fetchPatients();
    }
  }, [activeClinic?.id]);

  const fetchMedicines = async () => {
    if (!activeClinic?.id) return;
    const snap = await getDocs(
      query(collection(db, 'clinics', activeClinic.id, 'medicines'), orderBy('name'))
    );
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setMedicines(list);
  };

  const fetchPatients = async () => {
    if (!activeClinic?.id) return;
    const snap = await getDocs(
      query(collection(db, 'clinics', activeClinic.id, 'patients'), orderBy('name'))
    );
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setPatients(list);
  };

  const addMedicine = (med: any) => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        medicineName: med.name,
        quantity: 1,
        dosage: '1-0-1',
        timing: 'After Food',
        duration: 5,
        instructions: '',
        unitPrice: med.sellingPrice || 0,
        amount: med.sellingPrice || 0,
      },
    ]);
    setShowMedSearch(false);
    setMedSearchQuery('');
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === 'quantity' || field === 'unitPrice') {
        updated[index].amount = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const selectPatient = (patient: any) => {
    setPatientId(patient.id);
    setPatientName(patient.name);
    setPatientPhone(patient.phone || '');
    setPatientAge(patient.age ? String(patient.age) : '');
    setPatientGender(patient.gender || '');
    setShowPatientSearch(false);
    setPatientSearchQuery('');
  };

  const handleSave = async () => {
    if (!patientName.trim()) {
      Alert.alert('Error', 'Patient name is required.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Add at least one medicine.');
      return;
    }
    if (!activeClinic?.id) return;

    try {
      setSaving(true);
      const clinicId = activeClinic.id;
      const rxRef = doc(collection(db, 'clinics', clinicId, 'prescriptions'));

      await setDoc(rxRef, {
        patientId: patientId || '',
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge ? parseInt(patientAge) : null,
        patientGender: patientGender || null,
        doctorId: profile?.uid || '',
        doctorName: profile?.name || '',
        diagnosis: diagnosis.trim() || null,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: item.quantity,
          dosage: item.dosage,
          timing: item.timing,
          duration: item.duration,
          instructions: item.instructions,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        totalAmount,
        notes: notes.trim() || null,
        createdAt: serverTimestamp(),
      });

      // Decrement stock for each medicine
      for (const item of items) {
        if (item.medicineId) {
          const medRef = doc(db, 'clinics', clinicId, 'medicines', item.medicineId);
          await updateDoc(medRef, {
            currentStock: increment(-item.quantity),
            lastUpdated: serverTimestamp(),
          });
        }
      }

      // Update patient visit count
      if (patientId) {
        const patRef = doc(db, 'clinics', clinicId, 'patients', patientId);
        await updateDoc(patRef, {
          visitCount: increment(1),
          lastVisit: serverTimestamp(),
        });
      }

      Alert.alert('Prescription Saved', 'Stock has been updated.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMeds = medicines.filter((m) =>
    m.name.toLowerCase().includes(medSearchQuery.toLowerCase())
  );
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(patientSearchQuery))
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>New Prescription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Patient Section */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Patient</Text>
          <TouchableOpacity onPress={() => setShowPatientSearch(true)}>
            <Text style={[styles.searchLink, { color: colors.secondary }]}>Search Patient</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
          value={patientName}
          onChangeText={setPatientName}
          placeholder="Patient name *"
          placeholderTextColor={colors.textSecondary + '80'}
        />
        <View style={[styles.row, { marginTop: 10 }]}>
          <TextInput
            style={[styles.input, styles.flex1, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            value={patientPhone}
            onChangeText={setPatientPhone}
            placeholder="Phone"
            placeholderTextColor={colors.textSecondary + '80'}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { width: 60, color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            value={patientAge}
            onChangeText={setPatientAge}
            placeholder="Age"
            placeholderTextColor={colors.textSecondary + '80'}
            keyboardType="numeric"
          />
        </View>

        <TextInput
          style={[styles.input, { marginTop: 10, color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="Diagnosis (optional)"
          placeholderTextColor={colors.textSecondary + '80'}
        />

        {/* Medicines Section */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Medicines</Text>
          <TouchableOpacity
            style={[styles.addMedBtn, { backgroundColor: colors.secondary + '15' }]}
            onPress={() => setShowMedSearch(true)}
          >
            <Plus size={16} color={colors.secondary} />
            <Text style={[styles.addMedText, { color: colors.secondary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={[styles.emptyMeds, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No medicines added yet
            </Text>
          </View>
        ) : (
          items.map((item, idx) => (
            <View key={idx} style={[styles.rxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rxItemHeader}>
                <Text style={[styles.rxMedName, { color: colors.text }]}>{item.medicineName}</Text>
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.rxRow}>
                <View style={styles.rxField}>
                  <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Qty</Text>
                  <TextInput
                    style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(item.quantity)}
                    onChangeText={(v) => updateItem(idx, 'quantity', parseInt(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.rxField, { flex: 1.5 }]}>
                  <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Dosage</Text>
                  <TextInput
                    style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                    value={item.dosage}
                    onChangeText={(v) => updateItem(idx, 'dosage', v)}
                    placeholder="1-0-1"
                    placeholderTextColor={colors.textSecondary + '60'}
                  />
                </View>
                <View style={styles.rxField}>
                  <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Days</Text>
                  <TextInput
                    style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(item.duration)}
                    onChangeText={(v) => updateItem(idx, 'duration', parseInt(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rxRow}>
                <View style={[styles.rxField, { flex: 2 }]}>
                  <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Timing</Text>
                  <TextInput
                    style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                    value={item.timing}
                    onChangeText={(v) => updateItem(idx, 'timing', v)}
                  />
                </View>
                <View style={styles.rxField}>
                  <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Price</Text>
                  <TextInput
                    style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(item.unitPrice)}
                    onChangeText={(v) => updateItem(idx, 'unitPrice', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[styles.rxAmount, { color: colors.secondary }]}>
                Amount: {formatCurrency(item.amount)}
              </Text>
            </View>
          ))
        )}

        {/* Total */}
        {items.length > 0 && (
          <View style={[styles.totalBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        )}

        {/* Notes */}
        <TextInput
          style={[styles.input, { marginTop: 16, height: 70, textAlignVertical: 'top', paddingTop: 12, color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional notes (optional)"
          placeholderTextColor={colors.textSecondary + '80'}
          multiline
        />

        {/* Actions */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={styles.saveBtnText}>Save Prescription</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Medicine Search Modal */}
      <Modal visible={showMedSearch} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Medicine</Text>
              <TouchableOpacity onPress={() => { setShowMedSearch(false); setMedSearchQuery(''); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={medSearchQuery}
                onChangeText={setMedSearchQuery}
                placeholder="Search medicines..."
                placeholderTextColor={colors.textSecondary + '80'}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredMeds}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.divider }]}
                  onPress={() => addMedicine(item)}
                >
                  <View>
                    <Text style={[styles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.modalItemMeta, { color: colors.textSecondary }]}>
                      {item.category} — Stock: {item.currentStock} — {formatCurrency(item.sellingPrice || 0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 20, textAlign: 'center' }]}>
                  No medicines found
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Patient Search Modal */}
      <Modal visible={showPatientSearch} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Patient</Text>
              <TouchableOpacity onPress={() => { setShowPatientSearch(false); setPatientSearchQuery(''); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
                placeholder="Search by name or phone..."
                placeholderTextColor={colors.textSecondary + '80'}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.divider }]}
                  onPress={() => selectPatient(item)}
                >
                  <View>
                    <Text style={[styles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.modalItemMeta, { color: colors.textSecondary }]}>
                      {item.phone || 'No phone'}{item.age ? ` — ${item.age} yrs` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 20, textAlign: 'center' }]}>
                  No patients found
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
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
  content: { padding: 16, paddingBottom: 40 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  searchLink: { fontSize: 13, fontWeight: '600' },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  divider: { height: 1, marginVertical: 18 },
  addMedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addMedText: { fontSize: 13, fontWeight: '600' },
  emptyMeds: { padding: 24, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  rxItem: { padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 10 },
  rxItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rxMedName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  rxRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rxField: { flex: 1 },
  rxFieldLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  rxInput: { height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 14 },
  rxAmount: { fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  totalLabel: { fontSize: 14, fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 15, height: '100%' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
  modalItemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  modalItemMeta: { fontSize: 12 },
});
