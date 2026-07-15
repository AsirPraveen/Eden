import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3, TrendingUp, Package, Users, CreditCard,
  AlertTriangle, ArrowLeft, Calendar,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toDate, formatDate, getDaysRemaining } from '../../utils/helpers';
import {
  collection, getDocs, query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_CHART_WIDTH = SCREEN_WIDTH - 80;

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);

  // Analytics data
  const [revenue, setRevenue] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [newPatients, setNewPatients] = useState(0);
  const [medicinesSold, setMedicinesSold] = useState(0);
  const [topMedicines, setTopMedicines] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<{ category: string; amount: number; color: string }[]>([]);
  const [stockValue, setStockValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; amount: number }[]>([]);

  const getStartDate = (range: TimeRange): Date | null => {
    const now = new Date();
    switch (range) {
      case '7d': return new Date(now.setDate(now.getDate() - 7));
      case '30d': return new Date(now.setDate(now.getDate() - 30));
      case '90d': return new Date(now.setDate(now.getDate() - 90));
      default: return null;
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!activeClinic?.id) return;
    const clinicId = activeClinic.id;
    const startDate = getStartDate(timeRange);

    try {
      setLoading(true);

      // ─── Prescriptions ──────────────────────
      let prescQuery = startDate
        ? query(
            collection(db, 'clinics', clinicId, 'prescriptions'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc')
          )
        : query(
            collection(db, 'clinics', clinicId, 'prescriptions'),
            orderBy('createdAt', 'desc')
          );

      const prescSnap = await getDocs(prescQuery);
      let totalRev = 0;
      let medsSold = 0;
      const medCountMap: Record<string, { count: number; revenue: number }> = {};
      const catRevMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      const patientIds = new Set<string>();

      prescSnap.forEach((d) => {
        const data = d.data();
        totalRev += data.totalAmount || 0;
        if (data.patientId) patientIds.add(data.patientId);

        const dateKey = data.createdAt
          ? toDate(data.createdAt).toISOString().split('T')[0]
          : 'unknown';
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + (data.totalAmount || 0);

        (data.items || []).forEach((item: any) => {
          medsSold += item.quantity || 0;
          const name = item.medicineName || 'Unknown';
          if (!medCountMap[name]) medCountMap[name] = { count: 0, revenue: 0 };
          medCountMap[name].count += item.quantity || 0;
          medCountMap[name].revenue += item.amount || 0;
        });
      });

      setRevenue(totalRev);
      setPrescriptionCount(prescSnap.size);
      setMedicinesSold(medsSold);

      // Top medicines
      const topMeds = Object.entries(medCountMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 8)
        .map(([name, data]) => ({ name, ...data }));
      setTopMedicines(topMeds);

      // Daily revenue (last 7 entries)
      const dailyArr = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([date, amount]) => ({ date, amount }));
      setDailyRevenue(dailyArr);

      // ─── Patients ───────────────────────────
      const patientsSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'patients')
      );
      setPatientCount(patientsSnap.size);

      // New patients in range
      let newP = 0;
      if (startDate) {
        patientsSnap.forEach((d) => {
          const data = d.data();
          const created = data.createdAt ? toDate(data.createdAt) : new Date(0);
          if (created >= startDate) newP++;
        });
      } else {
        newP = patientsSnap.size;
      }
      setNewPatients(newP);

      // ─── Inventory ──────────────────────────
      const medsSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'medicines')
      );
      let sv = 0;
      let lsc = 0;
      medsSnap.forEach((d) => {
        const data = d.data();
        sv += (data.currentStock || 0) * (data.sellingPrice || 0);
        if (data.currentStock <= (data.reorderLevel || 10)) lsc++;
      });
      setStockValue(sv);
      setLowStockCount(lsc);

      // Expiring stock entries
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const stockSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'stockEntries')
      );
      let expiring = 0;
      stockSnap.forEach((d) => {
        const data = d.data();
        if (data.expiryDate) {
          const expDate = data.expiryDate.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
          if (expDate <= thirtyDaysFromNow) expiring++;
        }
      });
      setExpiringCount(expiring);

      // ─── Outstanding Payments ───────────────
      const payQuery = query(
        collection(db, 'clinics', clinicId, 'stockEntries'),
        where('paymentStatus', 'in', ['unpaid', 'partial'])
      );
      const paySnap = await getDocs(payQuery);
      let totalOut = 0;
      let overdue = 0;
      paySnap.forEach((d) => {
        const data = d.data();
        const remaining = (data.totalAmount || 0) - (data.paidAmount || 0);
        totalOut += remaining;
        if (data.paymentDueDate) {
          const due = data.paymentDueDate.toDate ? data.paymentDueDate.toDate() : new Date(data.paymentDueDate);
          if (due < new Date()) overdue++;
        }
      });
      setOutstandingTotal(totalOut);
      setOverdueCount(overdue);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id, timeRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const maxBar = Math.max(...topMedicines.map((m) => m.revenue), 1);
  const maxDailyBar = Math.max(...dailyRevenue.map((d) => d.amount), 1);

  const CATEGORY_COLORS: Record<string, string> = {
    Tablets: '#3B82F6',
    Capsules: '#8B5CF6',
    Syrups: '#F59E0B',
    Injections: '#EF4444',
    Ointments: '#10B981',
    Drops: '#06B6D4',
    Surgical: '#6366F1',
    Others: '#9CA3AF',
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ArrowLeft size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Analytics</Text>
            </View>
            <BarChart3 size={22} color="rgba(255,255,255,0.6)" />
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeRow}>
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeBtn,
                  timeRange === range && styles.timeRangeBtnActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range === 'all' ? 'All Time' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* Revenue Summary Cards */}
        <View style={styles.cardRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
              <TrendingUp size={18} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(revenue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revenue</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.tint + '15' }]}>
              <BarChart3 size={18} color={colors.tint} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{prescriptionCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Prescriptions</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '15' }]}>
              <Users size={18} color={colors.accent} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{patientCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Patients</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary + '15' }]}>
              <Package size={18} color={colors.secondary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{medicinesSold}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Medicines Sold</Text>
          </View>
        </View>

        {/* Revenue Trend (Bar Chart) */}
        {dailyRevenue.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Trend</Text>
            <View style={styles.barChart}>
              {dailyRevenue.map((day, idx) => {
                const barH = (day.amount / maxDailyBar) * 100;
                const dateObj = new Date(day.date);
                const dayLabel = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                return (
                  <View key={idx} style={styles.barCol}>
                    <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                      {day.amount >= 1000 ? `${(day.amount / 1000).toFixed(1)}K` : day.amount}
                    </Text>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={[colors.secondary, colors.tint]}
                        style={[styles.bar, { height: Math.max(barH, 4) }]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Selling Medicines */}
        {topMedicines.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Selling Medicines</Text>
            {topMedicines.map((med, idx) => (
              <View key={idx} style={styles.topMedRow}>
                <View style={styles.topMedInfo}>
                  <View style={styles.topMedRank}>
                    <Text style={[styles.rankText, { color: colors.textSecondary }]}>#{idx + 1}</Text>
                  </View>
                  <View style={styles.topMedName}>
                    <Text style={[styles.medName, { color: colors.text }]} numberOfLines={1}>{med.name}</Text>
                    <Text style={[styles.medCount, { color: colors.textSecondary }]}>{med.count} units</Text>
                  </View>
                </View>
                <View style={styles.topMedBar}>
                  <View style={styles.topMedBarTrack}>
                    <View
                      style={[
                        styles.topMedBarFill,
                        {
                          width: `${(med.revenue / maxBar) * 100}%`,
                          backgroundColor: colors.secondary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.topMedRevenue, { color: colors.text }]}>
                    {formatCurrency(med.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Inventory Overview */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Inventory Overview</Text>
          <View style={styles.inventoryRow}>
            <View style={[styles.inventoryItem, { backgroundColor: colors.secondary + '10' }]}>
              <Text style={[styles.inventoryValue, { color: colors.secondary }]}>{formatCurrency(stockValue)}</Text>
              <Text style={[styles.inventoryLabel, { color: colors.textSecondary }]}>Stock Value</Text>
            </View>
            <View style={[styles.inventoryItem, { backgroundColor: colors.warning + '10' }]}>
              <Text style={[styles.inventoryValue, { color: colors.warning }]}>{lowStockCount}</Text>
              <Text style={[styles.inventoryLabel, { color: colors.textSecondary }]}>Low Stock</Text>
            </View>
            <View style={[styles.inventoryItem, { backgroundColor: colors.danger + '10' }]}>
              <Text style={[styles.inventoryValue, { color: colors.danger }]}>{expiringCount}</Text>
              <Text style={[styles.inventoryLabel, { color: colors.textSecondary }]}>Expiring</Text>
            </View>
          </View>
        </View>

        {/* Financial Overview */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Overview</Text>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <CreditCard size={18} color={colors.danger} />
              <View style={styles.financeInfo}>
                <Text style={[styles.financeValue, { color: colors.danger }]}>
                  {formatCurrency(outstandingTotal)}
                </Text>
                <Text style={[styles.financeLabel, { color: colors.textSecondary }]}>Outstanding</Text>
              </View>
            </View>
            <View style={[styles.financeDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.financeItem}>
              <AlertTriangle size={18} color={colors.warning} />
              <View style={styles.financeInfo}>
                <Text style={[styles.financeValue, { color: colors.warning }]}>{overdueCount}</Text>
                <Text style={[styles.financeLabel, { color: colors.textSecondary }]}>Overdue</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Patient Stats */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Stats</Text>
          <View style={styles.patientStatsRow}>
            <View style={styles.patientStatItem}>
              <Text style={[styles.patientStatValue, { color: colors.text }]}>{patientCount}</Text>
              <Text style={[styles.patientStatLabel, { color: colors.textSecondary }]}>Total Patients</Text>
            </View>
            <View style={[styles.patientStatDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.patientStatItem}>
              <Text style={[styles.patientStatValue, { color: colors.success }]}>+{newPatients}</Text>
              <Text style={[styles.patientStatLabel, { color: colors.textSecondary }]}>New in Period</Text>
            </View>
            <View style={[styles.patientStatDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.patientStatItem}>
              <Text style={[styles.patientStatValue, { color: colors.accent }]}>
                {prescriptionCount > 0 && patientCount > 0
                  ? (prescriptionCount / patientCount).toFixed(1)
                  : '0'}
              </Text>
              <Text style={[styles.patientStatLabel, { color: colors.textSecondary }]}>Rx / Patient</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: { paddingBottom: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  timeRangeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 10,
  },
  timeRangeBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  timeRangeBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  timeRangeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  timeRangeTextActive: { color: '#fff' },
  content: { padding: 16, paddingTop: 16 },

  // Stat cards
  cardRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center',
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },

  // Sections
  section: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },

  // Bar Chart
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 9, fontWeight: '600', marginBottom: 4 },
  barTrack: { width: 20, height: 100, justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden' },
  bar: { width: 20, borderRadius: 6 },
  barLabel: { fontSize: 9, fontWeight: '500', marginTop: 4 },

  // Top Medicines
  topMedRow: { marginBottom: 14 },
  topMedInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  topMedRank: { width: 28 },
  rankText: { fontSize: 12, fontWeight: '700' },
  topMedName: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600' },
  medCount: { fontSize: 11 },
  topMedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 28 },
  topMedBarTrack: {
    flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden',
  },
  topMedBarFill: { height: 8, borderRadius: 4 },
  topMedRevenue: { fontSize: 12, fontWeight: '700', width: 70, textAlign: 'right' },

  // Inventory
  inventoryRow: { flexDirection: 'row', gap: 8 },
  inventoryItem: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  inventoryValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  inventoryLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },

  // Finance
  financeRow: { flexDirection: 'row', alignItems: 'center' },
  financeItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  financeInfo: {},
  financeValue: { fontSize: 18, fontWeight: '800', marginBottom: 1 },
  financeLabel: { fontSize: 11, fontWeight: '500' },
  financeDivider: { width: 1, height: 40, marginHorizontal: 12 },

  // Patient stats
  patientStatsRow: { flexDirection: 'row', alignItems: 'center' },
  patientStatItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  patientStatValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  patientStatLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', textAlign: 'center' },
  patientStatDivider: { width: 1, height: 36 },
});
