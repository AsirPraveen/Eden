import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Handshake, Phone, Mail, Calendar, Trash2,
  CreditCard, Plus, FileText,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, formatDate, toDate } from '../../utils/helpers';
import CountdownBadge from '../../components/CountdownBadge';
import {
  doc, getDoc, deleteDoc, collection, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function RepDetailsScreen({ navigation, route }: any) {
  const { repId } = route.params;
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [rep, setRep] = useState<any>(null);
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const clinicId = activeClinic.id;
      const repDoc = await getDoc(doc(db, 'clinics', clinicId, 'reps', repId));
      if (repDoc.exists()) {
        setRep({ id: repDoc.id, ...repDoc.data() });
      }

      const entryQ = query(
        collection(db, 'clinics', clinicId, 'stockEntries'),
        where('repId', '==', repId)
      );
      const entrySnap = await getDocs(entryQ);
      const entries: any[] = [];
      entrySnap.forEach((d) => entries.push({ id: d.id, ...d.data() }));

      // Sort in memory by createdAt desc
      entries.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setStockEntries(entries);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id, repId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Rep', `Delete "${rep?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'clinics', activeClinic!.id, 'reps', repId));
          navigation.goBack();
        },
      },
    ]);
  };

  const handleCallRep = () => {
    if (rep?.phone) {
      const url = Platform.OS === 'ios'
        ? `telprompt:${rep.phone}`
        : `tel:${rep.phone}`;
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to open phone dialer.')
      );
    }
  };

  const handleEmailRep = () => {
    if (rep?.email) {
      Linking.openURL(`mailto:${rep.email}`).catch(() =>
        Alert.alert('Error', 'Unable to open email app.')
      );
    }
  };

  const handleAddStock = () => {
    navigation.navigate('StockEntry', {
      repId: rep.id,
      repName: rep.name,
      companyName: rep.company,
    });
  };

  if (!rep) return null;

  const totalPurchased = stockEntries.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const totalPaid = stockEntries.reduce((s, e) => s + (e.paidAmount || 0), 0);
  const outstanding = totalPurchased - totalPaid;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Rep Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        {/* Rep Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
            <Handshake size={28} color={colors.accent} />
          </View>
          <Text style={[styles.repName, { color: colors.text }]}>{rep.name}</Text>
          <Text style={[styles.company, { color: colors.secondary }]}>{rep.company}</Text>

          {/* Contact Actions */}
          <View style={styles.contactActions}>
            {rep.phone ? (
              <TouchableOpacity
                style={[styles.contactPill, { backgroundColor: colors.success + '15' }]}
                onPress={handleCallRep}
                activeOpacity={0.7}
              >
                <Phone size={15} color={colors.success} />
                <Text style={[styles.contactPillText, { color: colors.success }]}>{rep.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {rep.email ? (
              <TouchableOpacity
                style={[styles.contactPill, { backgroundColor: colors.tint + '15' }]}
                onPress={handleEmailRep}
                activeOpacity={0.7}
              >
                <Mail size={15} color={colors.tint} />
                <Text style={[styles.contactPillText, { color: colors.tint }]}>{rep.email}</Text>
              </TouchableOpacity>
            ) : null}
            {rep.visitDay ? (
              <View style={[styles.contactPill, { backgroundColor: colors.warning + '12' }]}>
                <Calendar size={15} color={colors.warning} />
                <Text style={[styles.contactPillText, { color: colors.warning }]}>{rep.visitDay}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Add Stock Entry CTA */}
        <TouchableOpacity
          style={styles.addStockBtn}
          onPress={handleAddStock}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.linearGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addStockGradient}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addStockText}>Add Stock Entry</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Financial Summary */}
        <View style={styles.finRow}>
          <View style={[styles.finBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.finValue, { color: colors.text }]}>{formatCurrency(totalPurchased)}</Text>
            <Text style={[styles.finLabel, { color: colors.textSecondary }]}>Total Purchased</Text>
          </View>
          <View style={[styles.finBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.finValue, { color: colors.success }]}>{formatCurrency(totalPaid)}</Text>
            <Text style={[styles.finLabel, { color: colors.textSecondary }]}>Total Paid</Text>
          </View>
          <View style={[styles.finBox, { backgroundColor: outstanding > 0 ? colors.danger + '08' : colors.surface, borderColor: outstanding > 0 ? colors.danger + '30' : colors.border }]}>
            <Text style={[styles.finValue, { color: outstanding > 0 ? colors.danger : colors.success }]}>
              {formatCurrency(outstanding)}
            </Text>
            <Text style={[styles.finLabel, { color: colors.textSecondary }]}>Outstanding</Text>
          </View>
        </View>

        {/* Purchase History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Purchase History</Text>
          {stockEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No purchases recorded.
            </Text>
          ) : (
            stockEntries.map((entry) => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.entryTop}>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryMed, { color: colors.text }]}>{entry.medicineName}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
                      {entry.quantity} units — Batch: {entry.batchNo || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.entryAmounts}>
                    <Text style={[styles.entryTotal, { color: colors.text }]}>
                      {formatCurrency(entry.totalAmount || 0)}
                    </Text>
                    {entry.paymentStatus !== 'paid' && entry.paymentDueDate && (
                      <CountdownBadge dueDate={toDate(entry.paymentDueDate)} compact />
                    )}
                    {entry.paymentStatus === 'paid' && (
                      <Text style={[styles.paidTag, { color: colors.success }]}>Paid</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                  {entry.createdAt ? formatDate(toDate(entry.createdAt)) : ''}
                </Text>
              </View>
            ))
          )}
        </View>
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
  backBtn: { padding: 4, width: 40 },
  title: { fontSize: 18, fontWeight: '700' },
  deleteBtn: { padding: 4, width: 40, alignItems: 'flex-end' },
  content: { padding: 16, paddingBottom: 40 },
  card: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  repName: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  company: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  contactActions: { width: '100%', gap: 8 },
  contactPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  contactPillText: { fontSize: 14, fontWeight: '500' },
  // Add Stock CTA
  addStockBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 16,
  },
  addStockGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  addStockText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Financial
  finRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  finBox: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  finValue: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  finLabel: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase' },
  // History
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  entryCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  entryInfo: { flex: 1, marginRight: 12 },
  entryMed: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  entryMeta: { fontSize: 12 },
  entryAmounts: { alignItems: 'flex-end' },
  entryTotal: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  paidTag: { fontSize: 11, fontWeight: '700' },
  entryDate: { fontSize: 11, marginTop: 8 },
});
