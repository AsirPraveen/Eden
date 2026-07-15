import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText, Plus, Calendar, ChevronRight, ArrowLeft,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { formatCurrency, formatDate, toDate } from '../../utils/helpers';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function PrescriptionHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const q = query(
        collection(db, 'clinics', activeClinic.id, 'prescriptions'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setPrescriptions(list);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
    setRefreshing(false);
  };

  const filtered = prescriptions.filter((rx) => {
    const q = searchQuery.toLowerCase();
    return (
      rx.patientName?.toLowerCase().includes(q) ||
      rx.doctorName?.toLowerCase().includes(q) ||
      rx.diagnosis?.toLowerCase().includes(q) ||
      (rx.items || []).some((item: any) => item.medicineName?.toLowerCase().includes(q))
    );
  });

  // Group prescriptions by date
  const groupedByDate = filtered.reduce((acc: Record<string, any[]>, rx) => {
    const dateKey = rx.createdAt
      ? formatDate(toDate(rx.createdAt))
      : 'Unknown Date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(rx);
    return acc;
  }, {});

  const sections = Object.entries(groupedByDate).map(([date, items]) => ({
    date,
    data: items,
  }));

  const renderPrescription = (rx: any) => (
    <TouchableOpacity
      key={rx.id}
      style={[styles.rxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: rx.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.rxIcon, { backgroundColor: colors.tint + '15' }]}>
        <FileText size={18} color={colors.tint} />
      </View>
      <View style={styles.rxInfo}>
        <Text style={[styles.rxPatient, { color: colors.text }]}>{rx.patientName}</Text>
        {rx.diagnosis ? (
          <Text style={[styles.rxDiagnosis, { color: colors.textSecondary }]} numberOfLines={1}>
            Dx: {rx.diagnosis}
          </Text>
        ) : null}
        <Text style={[styles.rxMeta, { color: colors.textSecondary }]}>
          {rx.items?.length || 0} medicines • {formatCurrency(rx.totalAmount || 0)}
        </Text>
        {rx.doctorName && (
          <Text style={[styles.rxDoctor, { color: colors.textSecondary }]}>
            Dr. {rx.doctorName}
          </Text>
        )}
      </View>
      <ChevronRight size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ArrowLeft size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Prescriptions</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('PrescriptionForm')}
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by patient, medicine, diagnosis..."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{prescriptions.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatCurrency(prescriptions.reduce((sum, rx) => sum + (rx.totalAmount || 0), 0))}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Revenue</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {new Set(prescriptions.map((rx) => rx.patientId)).size}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Patients</Text>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        renderItem={({ item: section }) => (
          <View style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <Calendar size={13} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{section.date}</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.tint + '15' }]}>
                <Text style={[styles.countText, { color: colors.tint }]}>{section.data.length}</Text>
              </View>
            </View>
            {section.data.map(renderPrescription)}
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<FileText size={48} color={colors.textSecondary} />}
              title="No prescriptions yet"
              subtitle="Create your first prescription to start tracking."
              action={
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => navigation.navigate('PrescriptionForm')}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>New Prescription</Text>
                </TouchableOpacity>
              }
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  searchWrap: { paddingHorizontal: 16 },
  summaryBar: {
    flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },
  summaryDivider: { width: 1, marginVertical: 4 },
  list: { padding: 16, paddingTop: 8 },
  dateSection: { marginBottom: 8 },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  dateText: { fontSize: 13, fontWeight: '600' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '700' },
  rxCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  rxIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rxInfo: { flex: 1, marginRight: 8 },
  rxPatient: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rxDiagnosis: { fontSize: 12, marginBottom: 2 },
  rxMeta: { fontSize: 12, marginBottom: 1 },
  rxDoctor: { fontSize: 11, fontStyle: 'italic' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
