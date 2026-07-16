import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Plus, Trash2, Search, X, UserPlus, AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { DOSAGE_OPTIONS, DOSAGE_TIMINGS } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';
import { SignaturePreview } from '../../components/SignaturePad';
import {
  collection, getDocs, doc, setDoc, updateDoc, increment,
  serverTimestamp, query, orderBy,
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
  currentStock: number;
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

  // Inline add patient
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);

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

  // Auto-calculate quantity based on dosage pattern x duration
  const calcQuantity = (dosage: string, duration: number): number => {
    if (!dosage || !duration) return 1;
    const parts = dosage.split('-').map(Number);
    if (parts.some(isNaN)) return duration; // SOS or "As Directed"
    const perDay = parts.reduce((a, b) => a + b, 0);
    return perDay * duration;
  };

  const addMedicine = (med: any) => {
    const dosage = '1-0-1';
    const duration = 5;
    const qty = calcQuantity(dosage, duration);
    setItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        medicineName: med.name,
        quantity: qty,
        dosage,
        timing: 'After Food',
        duration,
        instructions: '',
        unitPrice: med.sellingPrice || 0,
        amount: (med.sellingPrice || 0) * qty,
        currentStock: med.currentStock || 0,
      },
    ]);
    setShowMedSearch(false);
    setMedSearchQuery('');
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;

      // Auto-recalculate quantity when dosage or duration changes
      if (field === 'dosage' || field === 'duration') {
        const newQty = calcQuantity(updated[index].dosage, updated[index].duration);
        updated[index].quantity = newQty;
        updated[index].amount = newQty * (updated[index].unitPrice || 0);
      }
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

  // Inline quick-add patient
  const handleQuickAddPatient = async () => {
    if (!newPatientName.trim()) {
      Alert.alert('Error', 'Patient name is required.');
      return;
    }
    if (!activeClinic?.id) return;
    try {
      setAddingPatient(true);
      const patRef = doc(collection(db, 'clinics', activeClinic.id, 'patients'));
      const patientData = {
        name: newPatientName.trim(),
        phone: newPatientPhone.trim(),
        age: newPatientAge ? parseInt(newPatientAge) : null,
        gender: null,
        bloodGroup: null,
        allergies: null,
        medicalHistory: null,
        notes: null,
        visitCount: 0,
        lastVisit: null,
        createdAt: serverTimestamp(),
      };
      await setDoc(patRef, patientData);

      // Select the new patient
      setPatientId(patRef.id);
      setPatientName(newPatientName.trim());
      setPatientPhone(newPatientPhone.trim());
      setPatientAge(newPatientAge);
      setShowInlineAdd(false);
      setShowPatientSearch(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientAge('');

      // Refresh patients list
      fetchPatients();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add patient.');
    } finally {
      setAddingPatient(false);
    }
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
        signatureData: profile?.signatureData || null,
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
          items.map((item, idx) => {
            const isLowStock = item.currentStock <= 0;
            const isWarnStock = item.currentStock > 0 && item.currentStock < item.quantity;

            return (
              <View key={idx} style={[styles.rxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.rxItemHeader}>
                  <View style={styles.rxMedNameRow}>
                    <Text style={[styles.rxMedName, { color: colors.text }]}>{item.medicineName}</Text>
                    {/* Stock warning */}
                    <View style={[
                      styles.stockBadge,
                      {
                        backgroundColor: isLowStock
                          ? colors.danger + '15'
                          : isWarnStock
                            ? colors.warning + '15'
                            : colors.success + '12',
                      },
                    ]}>
                      {(isLowStock || isWarnStock) && <AlertTriangle size={10} color={isLowStock ? colors.danger : colors.warning} />}
                      <Text style={[styles.stockBadgeText, {
                        color: isLowStock ? colors.danger : isWarnStock ? colors.warning : colors.success,
                      }]}>
                        {item.currentStock} in stock
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* Dosage Chips */}
                <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>Dosage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  <View style={styles.chipRow}>
                    {DOSAGE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.chip,
                          { borderColor: colors.border },
                          item.dosage === opt && { backgroundColor: colors.secondary + '20', borderColor: colors.secondary },
                        ]}
                        onPress={() => updateItem(idx, 'dosage', opt)}
                      >
                        <Text style={[styles.chipText, { color: item.dosage === opt ? colors.secondary : colors.textSecondary }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Timing Chips */}
                <Text style={[styles.chipLabel, { color: colors.textSecondary, marginTop: 8 }]}>Timing</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  <View style={styles.chipRow}>
                    {DOSAGE_TIMINGS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.chip,
                          { borderColor: colors.border },
                          item.timing === opt && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                        ]}
                        onPress={() => updateItem(idx, 'timing', opt)}
                      >
                        <Text style={[styles.chipText, { color: item.timing === opt ? colors.accent : colors.textSecondary }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={[styles.rxRow, { marginTop: 10 }]}>
                  <View style={styles.rxField}>
                    <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Days</Text>
                    <TextInput
                      style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                      value={String(item.duration)}
                      onChangeText={(v) => updateItem(idx, 'duration', parseInt(v) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rxField}>
                    <Text style={[styles.rxFieldLabel, { color: colors.textSecondary }]}>Qty (auto)</Text>
                    <TextInput
                      style={[styles.rxInput, { color: colors.text, borderColor: colors.border }]}
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItem(idx, 'quantity', parseInt(v) || 0)}
                      keyboardType="numeric"
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
            );
          })
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

        {/* Signature Preview */}
        {profile?.signatureData ? (
          <View style={[styles.signatureSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Doctor Signature</Text>
            <SignaturePreview pathData={profile.signatureData} height={60} />
          </View>
        ) : (
          <View style={[styles.noSignature, { borderColor: colors.border }]}>
            <Text style={[styles.noSignatureText, { color: colors.textSecondary }]}>
              No signature saved. Add one in your Profile.
            </Text>
          </View>
        )}

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
              renderItem={({ item }) => {
                const isLow = (item.currentStock || 0) <= 0;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.divider }]}
                    onPress={() => addMedicine(item)}
                  >
                    <View style={styles.modalItemLeft}>
                      <Text style={[styles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.modalItemMeta, { color: colors.textSecondary }]}>
                        {item.category} — {formatCurrency(item.sellingPrice || 0)}
                      </Text>
                    </View>
                    <View style={[styles.stockPill, { backgroundColor: isLow ? colors.danger + '15' : colors.success + '12' }]}>
                      <Text style={[styles.stockPillText, { color: isLow ? colors.danger : colors.success }]}>
                        {item.currentStock || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
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
              <TouchableOpacity onPress={() => { setShowPatientSearch(false); setPatientSearchQuery(''); setShowInlineAdd(false); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Add Patient */}
            {!showInlineAdd ? (
              <TouchableOpacity
                style={[styles.quickAddBtn, { backgroundColor: colors.secondary + '12' }]}
                onPress={() => setShowInlineAdd(true)}
              >
                <UserPlus size={18} color={colors.secondary} />
                <Text style={[styles.quickAddText, { color: colors.secondary }]}>Quick Add New Patient</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.inlineAddForm, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.inlineInput, { color: colors.text, borderColor: colors.border }]}
                  value={newPatientName}
                  onChangeText={setNewPatientName}
                  placeholder="Patient name *"
                  placeholderTextColor={colors.textSecondary + '80'}
                  autoFocus
                />
                <View style={styles.inlineRow}>
                  <TextInput
                    style={[styles.inlineInput, styles.flex1, { color: colors.text, borderColor: colors.border }]}
                    value={newPatientPhone}
                    onChangeText={setNewPatientPhone}
                    placeholder="Phone"
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[styles.inlineInput, { width: 60, color: colors.text, borderColor: colors.border }]}
                    value={newPatientAge}
                    onChangeText={setNewPatientAge}
                    placeholder="Age"
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    style={[styles.inlineCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowInlineAdd(false)}
                  >
                    <Text style={[styles.inlineCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineSaveBtn, { backgroundColor: colors.secondary }]}
                    onPress={handleQuickAddPatient}
                    disabled={addingPatient}
                  >
                    {addingPatient ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.inlineSaveText}>Add & Select</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={[styles.modalSearch, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
                placeholder="Search by name or phone..."
                placeholderTextColor={colors.textSecondary + '80'}
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
  rxItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  rxMedNameRow: { flex: 1, marginRight: 8 },
  rxMedName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start',
  },
  stockBadgeText: { fontSize: 10, fontWeight: '600' },
  chipLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
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
  // Signature
  signatureSection: {
    marginTop: 16, padding: 12, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', alignItems: 'center',
  },
  noSignature: {
    marginTop: 16, padding: 14, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', alignItems: 'center',
  },
  noSignatureText: { fontSize: 12, fontStyle: 'italic' },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 15, height: '100%' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  modalItemLeft: { flex: 1 },
  modalItemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  modalItemMeta: { fontSize: 12 },
  stockPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8,
  },
  stockPillText: { fontSize: 12, fontWeight: '700' },
  // Quick Add Patient
  quickAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12,
  },
  quickAddText: { fontSize: 14, fontWeight: '600' },
  inlineAddForm: {
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  inlineInput: {
    height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, marginBottom: 8,
  },
  inlineRow: { flexDirection: 'row', gap: 8 },
  inlineActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  inlineCancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  inlineCancelText: { fontSize: 13, fontWeight: '600' },
  inlineSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  inlineSaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
