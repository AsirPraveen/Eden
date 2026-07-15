import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Truck, Calendar } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { DEFAULT_PAYMENT_TERM_DAYS } from '../../utils/constants';
import {
  collection, doc, setDoc, updateDoc, increment, serverTimestamp, Timestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addDays } from 'date-fns';

export default function StockEntryScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [medicineName, setMedicineName] = useState('');
  const [medicineId, setMedicineId] = useState(route?.params?.medicineId || '');
  const [quantity, setQuantity] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [repName, setRepName] = useState('');
  const [repId, setRepId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState(String(DEFAULT_PAYMENT_TERM_DAYS));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMedicineDetails = async () => {
      if (medicineId && activeClinic?.id) {
        try {
          const docRef = doc(db, 'clinics', activeClinic.id, 'medicines', medicineId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMedicineName(data.name || '');
            if (data.sellingPrice) setSellingPrice(String(data.sellingPrice));
            if (data.avgPurchasePrice) setPurchasePrice(String(data.avgPurchasePrice));
            if (data.manufacturer) setCompanyName(data.manufacturer);
          }
        } catch (error) {
          console.error('Error fetching medicine details for stock entry:', error);
        }
      }
    };
    fetchMedicineDetails();
  }, [medicineId, activeClinic?.id]);

  const handleSave = async () => {
    if (!medicineName.trim() || !quantity.trim()) {
      Alert.alert('Error', 'Medicine name and quantity are required.');
      return;
    }
    if (!activeClinic?.id) return;

    try {
      setSaving(true);
      const clinicId = activeClinic.id;
      const qty = parseInt(quantity) || 0;
      const price = parseFloat(purchasePrice) || 0;
      const sell = parseFloat(sellingPrice) || 0;
      const termDays = parseInt(paymentTermDays) || DEFAULT_PAYMENT_TERM_DAYS;
      const totalAmount = qty * price;
      const dueDate = addDays(new Date(), termDays);

      const entryRef = doc(collection(db, 'clinics', clinicId, 'stockEntries'));

      await setDoc(entryRef, {
        medicineId: medicineId || '',
        medicineName: medicineName.trim(),
        quantity: qty,
        batchNo: batchNo.trim(),
        expiryDate: null,
        purchasePrice: price,
        sellingPrice: sell,
        repId: repId || '',
        repName: repName.trim(),
        companyName: companyName.trim(),
        paymentTermDays: termDays,
        paymentDueDate: Timestamp.fromDate(dueDate),
        paymentStatus: totalAmount > 0 ? 'unpaid' : 'paid',
        paidAmount: 0,
        totalAmount,
        createdAt: serverTimestamp(),
      });

      // Increment medicine stock if we have a medicine ID
      if (medicineId) {
        const medRef = doc(db, 'clinics', clinicId, 'medicines', medicineId);
        await updateDoc(medRef, {
          currentStock: increment(qty),
          lastUpdated: serverTimestamp(),
        });
      }

      Alert.alert('Success', `Stock entry of ${qty} units recorded.`, [
        { text: 'Add Another', onPress: () => { setQuantity(''); setBatchNo(''); } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record stock entry.');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string, value: string, onChangeText: (t: string) => void,
    opts: { placeholder?: string; keyboardType?: any; required?: boolean; editable?: boolean } = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}{opts.required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
          opts.editable === false && { opacity: 0.65 }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={opts.placeholder}
        placeholderTextColor={colors.textSecondary + '80'}
        keyboardType={opts.keyboardType || 'default'}
        editable={opts.editable !== false}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Stock Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
          <Truck size={28} color={colors.accent} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Medicine Details</Text>
        {renderInput('Medicine Name', medicineName, setMedicineName, { placeholder: 'e.g., Amoxicillin 500mg', required: true, editable: !medicineId })}
        {renderInput('Quantity', quantity, setQuantity, { placeholder: '0', keyboardType: 'numeric', required: true })}
        {renderInput('Batch No.', batchNo, setBatchNo, { placeholder: 'Optional' })}

        <View style={[styles.row]}>
          <View style={styles.half}>
            {renderInput('Purchase Price (₹)', purchasePrice, setPurchasePrice, { placeholder: '0.00', keyboardType: 'decimal-pad' })}
          </View>
          <View style={styles.half}>
            {renderInput('Selling Price (₹)', sellingPrice, setSellingPrice, { placeholder: '0.00', keyboardType: 'decimal-pad' })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Rep & Payment</Text>
        {renderInput('Rep Name', repName, setRepName, { placeholder: 'Medical representative name' })}
        {renderInput('Company', companyName, setCompanyName, { placeholder: 'Pharmaceutical company' })}
        {renderInput('Payment Term (days)', paymentTermDays, setPaymentTermDays, { placeholder: '50', keyboardType: 'numeric' })}

        {/* Total & Due Date preview */}
        {quantity && purchasePrice ? (
          <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Total Amount</Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                ₹{((parseInt(quantity) || 0) * (parseFloat(purchasePrice) || 0)).toFixed(2)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Payment Due</Text>
              <Text style={[styles.previewValue, { color: colors.warning }]}>
                {addDays(new Date(), parseInt(paymentTermDays) || 50).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Record Stock Entry</Text>
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
  divider: { height: 1, marginVertical: 20 },
  preview: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  previewLabel: { fontSize: 13 },
  previewValue: { fontSize: 15, fontWeight: '700' },
  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
