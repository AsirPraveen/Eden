import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Clock, CheckCircle, Filter, CreditCard, X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import CountdownBadge from '../../components/CountdownBadge';
import EmptyState from '../../components/EmptyState';
import { formatCurrency, toDate } from '../../utils/helpers';
import { PAYMENT_MODES } from '../../utils/constants';
import {
  collection, getDocs, doc, updateDoc, setDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

type StockEntryWithId = {
  id: string;
  medicineName: string;
  repName: string;
  companyName: string;
  totalAmount: number;
  paidAmount: number;
  paymentDueDate: any;
  paymentStatus: string;
  remaining: number;
  createdAt: any;
};

export default function PaymentTrackerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [entries, setEntries] = useState<StockEntryWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('unpaid');

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockEntryWithId | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [paying, setPaying] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      let q;
      if (filter === 'all') {
        q = query(
          collection(db, 'clinics', activeClinic.id, 'stockEntries'),
          orderBy('paymentDueDate', 'asc')
        );
      } else {
        q = query(
          collection(db, 'clinics', activeClinic.id, 'stockEntries'),
          where('paymentStatus', '==', filter)
        );
      }
      const snap = await getDocs(q);
      const list: StockEntryWithId[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          medicineName: data.medicineName || '',
          repName: data.repName || '',
          companyName: data.companyName || '',
          totalAmount: data.totalAmount || 0,
          paidAmount: data.paidAmount || 0,
          paymentDueDate: data.paymentDueDate,
          paymentStatus: data.paymentStatus || 'unpaid',
          remaining: (data.totalAmount || 0) - (data.paidAmount || 0),
          createdAt: data.createdAt,
        });
      });

      if (filter !== 'all') {
        list.sort((a, b) => {
          const dateA = a.paymentDueDate?.seconds ? a.paymentDueDate.seconds * 1000 : new Date(a.paymentDueDate).getTime();
          const dateB = b.paymentDueDate?.seconds ? b.paymentDueDate.seconds * 1000 : new Date(b.paymentDueDate).getTime();
          return dateA - dateB;
        });
      }
      setEntries(list);
    } catch (err) {
      console.error('Error fetching payment entries:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id, filter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const openPayModal = (entry: StockEntryWithId) => {
    setSelectedEntry(entry);
    setPayAmount(String(entry.remaining));
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedEntry || !activeClinic?.id) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount.');
      return;
    }

    try {
      setPaying(true);
      const clinicId = activeClinic.id;
      const newPaidAmount = selectedEntry.paidAmount + amount;
      const newStatus = newPaidAmount >= selectedEntry.totalAmount ? 'paid' : 'partial';

      // Update stock entry
      await updateDoc(doc(db, 'clinics', clinicId, 'stockEntries', selectedEntry.id), {
        paidAmount: newPaidAmount,
        paymentStatus: newStatus,
      });

      // Record payment
      const payRef = doc(collection(db, 'clinics', clinicId, 'payments'));
      await setDoc(payRef, {
        repId: '',
        repName: selectedEntry.repName,
        stockEntryIds: [selectedEntry.id],
        amount,
        mode: payMode,
        reference: '',
        notes: '',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setShowPayModal(false);
      setSelectedEntry(null);
      Alert.alert('Payment Recorded', `${formatCurrency(amount)} paid to ${selectedEntry.repName}.`);
      fetchEntries();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  const totalOutstanding = entries.reduce((sum, e) => sum + e.remaining, 0);

  const filterOptions = [
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'partial', label: 'Partial' },
    { key: 'paid', label: 'Paid' },
    { key: 'all', label: 'All' },
  ] as const;

  const renderEntry = ({ item }: { item: StockEntryWithId }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.repName, { color: colors.text }]}>{item.repName || 'Unknown Rep'}</Text>
          <Text style={[styles.company, { color: colors.textSecondary }]}>{item.companyName}</Text>
          <Text style={[styles.medicine, { color: colors.textSecondary }]}>{item.medicineName}</Text>
        </View>
        {item.paymentStatus !== 'paid' && item.paymentDueDate && (
          <CountdownBadge dueDate={toDate(item.paymentDueDate)} />
        )}
        {item.paymentStatus === 'paid' && (
          <View style={[styles.paidBadge, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={[styles.paidText, { color: colors.success }]}>Paid</Text>
          </View>
        )}
      </View>

      <View style={[styles.amountRow, { borderTopColor: colors.divider }]}>
        <View>
          <Text style={[styles.amtLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.amtValue, { color: colors.text }]}>{formatCurrency(item.totalAmount)}</Text>
        </View>
        <View>
          <Text style={[styles.amtLabel, { color: colors.textSecondary }]}>Paid</Text>
          <Text style={[styles.amtValue, { color: colors.success }]}>{formatCurrency(item.paidAmount)}</Text>
        </View>
        <View>
          <Text style={[styles.amtLabel, { color: colors.textSecondary }]}>Due</Text>
          <Text style={[styles.amtValue, { color: colors.danger }]}>{formatCurrency(item.remaining)}</Text>
        </View>
        {item.paymentStatus !== 'paid' && (
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: colors.secondary }]}
            onPress={() => openPayModal(item)}
          >
            <CreditCard size={14} color="#fff" />
            <Text style={styles.payBtnText}>Pay</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
          <View style={{ width: 40 }} />
        </View>
        {filter !== 'paid' && totalOutstanding > 0 && (
          <View style={styles.outstandingSummary}>
            <Text style={styles.outstandingLabel}>Total Outstanding</Text>
            <Text style={styles.outstandingValue}>{formatCurrency(totalOutstanding)}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filter === opt.key && { backgroundColor: colors.secondary + '15', borderColor: colors.secondary },
            ]}
            onPress={() => setFilter(opt.key)}
          >
            <Text style={[
              styles.filterChipText,
              { color: filter === opt.key ? colors.secondary : colors.textSecondary },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Clock size={48} color={colors.textSecondary} />}
              title="No payment records"
              subtitle="Stock entries with payment info will appear here."
            />
          ) : null
        }
      />

      {/* Pay Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEntry && (
              <>
                <Text style={[styles.payInfo, { color: colors.textSecondary }]}>
                  {selectedEntry.repName} — {selectedEntry.companyName}
                </Text>
                <Text style={[styles.payDue, { color: colors.text }]}>
                  Outstanding: {formatCurrency(selectedEntry.remaining)}
                </Text>

                <View style={styles.payInputGroup}>
                  <Text style={[styles.payLabel, { color: colors.text }]}>Amount (₹)</Text>
                  <TextInput
                    style={[styles.payInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    value={payAmount}
                    onChangeText={setPayAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>

                <View style={styles.payInputGroup}>
                  <Text style={[styles.payLabel, { color: colors.text }]}>Payment Mode</Text>
                  <View style={styles.modeRow}>
                    {PAYMENT_MODES.map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modeChip,
                          { borderColor: colors.border },
                          payMode === mode && { backgroundColor: colors.secondary + '15', borderColor: colors.secondary },
                        ]}
                        onPress={() => setPayMode(mode)}
                      >
                        <Text style={[
                          styles.modeChipText,
                          { color: payMode === mode ? colors.secondary : colors.textSecondary },
                        ]}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handlePay}
                  disabled={paying}
                  style={[styles.confirmPayBtn, { backgroundColor: colors.secondary }]}
                >
                  {paying ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={styles.confirmPayText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerGradient: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  outstandingSummary: { alignItems: 'center', paddingBottom: 4 },
  outstandingLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  outstandingValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  cardInfo: { flex: 1, marginRight: 12 },
  repName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  company: { fontSize: 12, marginBottom: 2 },
  medicine: { fontSize: 12 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  paidText: { fontSize: 12, fontWeight: '600' },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  amtLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  amtValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  payInfo: { fontSize: 14, marginBottom: 4 },
  payDue: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  payInputGroup: { marginBottom: 18 },
  payLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  payInput: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 18, fontWeight: '700' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  modeChipText: { fontSize: 13, fontWeight: '600' },
  confirmPayBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  confirmPayText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
