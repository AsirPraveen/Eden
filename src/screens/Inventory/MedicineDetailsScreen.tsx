import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Package, Edit3, Truck, Trash2, AlertTriangle,
  TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, formatDate, toDate } from '../../utils/helpers';
import CountdownBadge from '../../components/CountdownBadge';
import {
  doc, getDoc, collection, query, where, getDocs,
  orderBy, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function MedicineDetailsScreen({ navigation, route }: any) {
  const { medicineId } = route.params;
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [medicine, setMedicine] = useState<any>(null);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const clinicId = activeClinic.id;

      // Fetch medicine
      const medDoc = await getDoc(doc(db, 'clinics', clinicId, 'medicines', medicineId));
      if (medDoc.exists()) {
        setMedicine({ id: medDoc.id, ...medDoc.data() });
      }

      // Fetch stock entries for this medicine
      const stockQ = query(
        collection(db, 'clinics', clinicId, 'stockEntries'),
        where('medicineId', '==', medicineId),
        orderBy('createdAt', 'desc')
      );
      const stockSnap = await getDocs(stockQ);
      const history: any[] = [];
      stockSnap.forEach((d) => history.push({ id: d.id, ...d.data() }));
      setStockHistory(history);
    } catch (err) {
      console.error('Error fetching medicine details:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id, medicineId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete "${medicine?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'clinics', activeClinic!.id, 'medicines', medicineId));
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  if (!medicine) return null;

  const isLowStock = medicine.currentStock <= (medicine.reorderLevel || 10);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {medicine.name}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        {/* Medicine Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '15' }]}>
            <Package size={28} color={colors.secondary} />
          </View>
          <Text style={[styles.medName, { color: colors.text }]}>{medicine.name}</Text>
          <Text style={[styles.medCategory, { color: colors.textSecondary }]}>
            {medicine.category} — {medicine.unit}
          </Text>
          {medicine.manufacturer ? (
            <Text style={[styles.manufacturer, { color: colors.textSecondary }]}>
              by {medicine.manufacturer}
            </Text>
          ) : null}
        </View>

        {/* Stock & Price Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: isLowStock ? colors.warning + '40' : colors.border }]}>
            {isLowStock && <AlertTriangle size={14} color={colors.warning} style={{ position: 'absolute', top: 10, right: 10 }} />}
            <Text style={[styles.statValue, { color: isLowStock ? colors.warning : colors.text }]}>
              {medicine.currentStock}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Stock</Text>
            <Text style={[styles.statSub, { color: colors.textSecondary }]}>
              Reorder at {medicine.reorderLevel || 10}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {formatCurrency(medicine.sellingPrice || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Selling Price</Text>
            <Text style={[styles.statSub, { color: colors.textSecondary }]}>
              Avg. Cost: {formatCurrency(medicine.avgPurchasePrice || 0)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('StockEntry', { medicineId: medicine.id })}
          >
            <Truck size={16} color="#fff" />
            <Text style={styles.actionText}>Add Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Stock History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Stock History</Text>
          {stockHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No stock entries recorded yet.
            </Text>
          ) : (
            stockHistory.map((entry) => (
              <View key={entry.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.historyTop}>
                  <View style={styles.historyInfo}>
                    <View style={styles.historyRow}>
                      <TrendingUp size={14} color={colors.success} />
                      <Text style={[styles.historyQty, { color: colors.success }]}>
                        +{entry.quantity} units
                      </Text>
                    </View>
                    <Text style={[styles.historyRep, { color: colors.text }]}>
                      {entry.repName || 'Direct purchase'}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                      {entry.companyName} — Batch: {entry.batchNo || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyPrice, { color: colors.text }]}>
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
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
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
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  deleteBtn: { padding: 4, width: 40, alignItems: 'flex-end' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  medName: { fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  medCategory: { fontSize: 14, marginBottom: 2 },
  manufacturer: { fontSize: 13, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  statSub: { fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 12, gap: 6,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  historyCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between' },
  historyInfo: { flex: 1, marginRight: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  historyQty: { fontSize: 14, fontWeight: '700' },
  historyRep: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  historyMeta: { fontSize: 12 },
  historyRight: { alignItems: 'flex-end' },
  historyPrice: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  paidTag: { fontSize: 11, fontWeight: '700' },
  historyDate: { fontSize: 11, marginTop: 8 },
});
