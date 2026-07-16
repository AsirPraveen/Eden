import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Truck, Calendar, Package, Handshake } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import SmartDropdown from '../../components/SmartDropdown';
import { DEFAULT_PAYMENT_TERM_DAYS } from '../../utils/constants';
import {
  collection, doc, setDoc, updateDoc, increment, serverTimestamp, Timestamp, getDoc, getDocs, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addDays } from 'date-fns';

export default function StockEntryScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  // Route params
  const paramMedicineId = route?.params?.medicineId || '';
  const paramRepId = route?.params?.repId || '';
  const paramRepName = route?.params?.repName || '';
  const paramCompany = route?.params?.companyName || '';

  const [medicineName, setMedicineName] = useState('');
  const [medicineId, setMedicineId] = useState(paramMedicineId);
  const [quantity, setQuantity] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [repName, setRepName] = useState(paramRepName);
  const [repId, setRepId] = useState(paramRepId);
  const [companyName, setCompanyName] = useState(paramCompany);
  const [paymentTermDays, setPaymentTermDays] = useState(String(DEFAULT_PAYMENT_TERM_DAYS));
  const [saving, setSaving] = useState(false);

  // Data for dropdowns
  const [medicines, setMedicines] = useState<any[]>([]);
  const [reps, setReps] = useState<any[]>([]);

  // Fetch medicines and reps for dropdown
  useEffect(() => {
    if (!activeClinic?.id) return;
    const fetchData = async () => {
      const clinicId = activeClinic.id;
      // Medicines
      const medSnap = await getDocs(
        query(collection(db, 'clinics', clinicId, 'medicines'), orderBy('name'))
      );
      const medList: any[] = [];
      medSnap.forEach((d) => medList.push({ id: d.id, ...d.data() }));
      setMedicines(medList);

      // Reps
      const repSnap = await getDocs(
        query(collection(db, 'clinics', clinicId, 'reps'), orderBy('name'))
      );
      const repList: any[] = [];
      repSnap.forEach((d) => repList.push({ id: d.id, ...d.data() }));
      setReps(repList);
    };
    fetchData();
  }, [activeClinic?.id]);

  // Pre-fill from medicineId param
  useEffect(() => {
    const fetchMedicineDetails = async () => {
      if (paramMedicineId && activeClinic?.id) {
        try {
          const docRef = doc(db, 'clinics', activeClinic.id, 'medicines', paramMedicineId);
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
  }, [paramMedicineId, activeClinic?.id]);

  const handleSelectMedicine = (med: any) => {
    setMedicineId(med.id);
    setMedicineName(med.name);
    if (med.sellingPrice) setSellingPrice(String(med.sellingPrice));
    if (med.avgPurchasePrice) setPurchasePrice(String(med.avgPurchasePrice));
  };

  const handleSelectRep = (rep: any) => {
    setRepId(rep.id);
    setRepName(rep.name);
    setCompanyName(rep.company || '');
  };

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

  const isMedicineLocked = !!paramMedicineId;
  const isRepLocked = !!paramRepId;

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

        {/* Medicine Section */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Medicine Details</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Medicine Name<Text style={{ color: colors.danger }}> *</Text>
          </Text>
          {isMedicineLocked ? (
            <View style={[styles.input, styles.lockedField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Package size={16} color={colors.secondary} />
              <Text style={[styles.lockedText, { color: colors.text }]}>{medicineName}</Text>
            </View>
          ) : (
            <SmartDropdown
              data={medicines}
              labelKey="name"
              subtitleKey="category"
              onSelect={handleSelectMedicine}
              onAddNew={() => navigation.navigate('AddMedicine')}
              addNewLabel="Add New Medicine"
              placeholder="Select medicine..."
              selectedValue={medicineName}
              icon={<Package size={16} color={colors.textSecondary} />}
            />
          )}
        </View>

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

        {/* Rep Section */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Rep & Payment</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Rep Name</Text>
          {isRepLocked ? (
            <View style={[styles.input, styles.lockedField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Handshake size={16} color={colors.accent} />
              <Text style={[styles.lockedText, { color: colors.text }]}>{repName}</Text>
            </View>
          ) : (
            <SmartDropdown
              data={reps}
              labelKey="name"
              subtitleKey="company"
              onSelect={handleSelectRep}
              onAddNew={() => navigation.navigate('AddRep')}
              addNewLabel="Add New Rep"
              placeholder="Select rep..."
              selectedValue={repName}
              icon={<Handshake size={16} color={colors.textSecondary} />}
            />
          )}
        </View>

        {renderInput('Company', companyName, setCompanyName, { placeholder: 'Pharmaceutical company', editable: !isRepLocked })}
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
  lockedField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.75,
  },
  lockedText: { fontSize: 15, fontWeight: '500' },
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
