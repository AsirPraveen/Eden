import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package,
  FileText,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import StatsCard from '../../components/StatsCard';
import CountdownBadge from '../../components/CountdownBadge';
import { getGreeting, formatCurrency, cleanDoctorName } from '../../utils/helpers';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { activeClinic } = useClinic();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStock: 0,
    todayPrescriptions: 0,
    totalPatients: 0,
    pendingPayments: 0,
    totalOutstanding: 0,
  });
  const [urgentPayments, setUrgentPayments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!activeClinic?.id) return;

    try {
      const clinicId = activeClinic.id;

      // Fetch medicines count & low stock
      const medsSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'medicines')
      );
      let lowStockCount = 0;
      medsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.currentStock <= (data.reorderLevel || 10)) {
          lowStockCount++;
        }
      });

      // Fetch patients count
      const patientsSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'patients')
      );

      // Fetch today's prescriptions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const prescriptionsQuery = query(
        collection(db, 'clinics', clinicId, 'prescriptions'),
        where('createdAt', '>=', Timestamp.fromDate(todayStart)),
        orderBy('createdAt', 'desc')
      );
      const prescSnap = await getDocs(prescriptionsQuery);

      // Fetch recent prescriptions (last 5)
      const recentQuery = query(
        collection(db, 'clinics', clinicId, 'prescriptions'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSnap = await getDocs(recentQuery);
      const recent: any[] = [];
      recentSnap.forEach((doc) => {
        recent.push({ id: doc.id, ...doc.data() });
      });
      setRecentPrescriptions(recent);

      // Fetch outstanding payments (stock entries with unpaid/partial status)
      const paymentQuery = query(
        collection(db, 'clinics', clinicId, 'stockEntries'),
        where('paymentStatus', 'in', ['unpaid', 'partial'])
      );
      const paySnap = await getDocs(paymentQuery);
      let totalOutstanding = 0;
      const urgent: any[] = [];
      paySnap.forEach((doc) => {
        const data = doc.data();
        const remaining = (data.totalAmount || 0) - (data.paidAmount || 0);
        totalOutstanding += remaining;
        urgent.push({
          id: doc.id,
          ...data,
          remaining,
        });
      });

      // Sort in memory by paymentDueDate asc
      urgent.sort((a, b) => {
        const dateA = a.paymentDueDate?.seconds ? a.paymentDueDate.seconds * 1000 : new Date(a.paymentDueDate).getTime();
        const dateB = b.paymentDueDate?.seconds ? b.paymentDueDate.seconds * 1000 : new Date(b.paymentDueDate).getTime();
        return dateA - dateB;
      });

      setStats({
        totalMedicines: medsSnap.size,
        lowStock: lowStockCount,
        todayPrescriptions: prescSnap.size,
        totalPatients: patientsSnap.size,
        pendingPayments: paySnap.size,
        totalOutstanding,
      });
      setUrgentPayments(urgent.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [activeClinic?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const greeting = getGreeting();
  const firstName = cleanDoctorName(profile?.name).split(' ')[0] || 'Doctor';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.doctorName}>Dr. {firstName}</Text>
            </View>
            <TouchableOpacity
              style={styles.clinicBadge}
              onPress={() => navigation.navigate('ClinicSelection')}
            >
              <Text style={styles.clinicBadgeText} numberOfLines={1}>
                {activeClinic?.name || 'Select Clinic'}
              </Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.secondary + '15' }]}
            onPress={() => navigation.navigate('PrescriptionForm')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary + '20' }]}>
              <FileText size={20} color={colors.secondary} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>New Prescription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.accent + '15' }]}
            onPress={() => navigation.navigate('AddMedicine')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
              <Plus size={20} color={colors.accent} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Add Medicine</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.tint + '15' }]}
            onPress={() => navigation.navigate('AddPatient')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '20' }]}>
              <Users size={20} color={colors.tint} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Add Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatsCard
            icon={<Package size={18} color={colors.secondary} />}
            label="Medicines"
            value={stats.totalMedicines}
            accentColor={colors.secondary}
          />
          <View style={{ width: 10 }} />
          <StatsCard
            icon={<FileText size={18} color={colors.tint} />}
            label="Today's Rx"
            value={stats.todayPrescriptions}
            accentColor={colors.tint}
          />
        </View>

        <View style={[styles.statsRow, { marginTop: 10 }]}>
          <StatsCard
            icon={<Users size={18} color={colors.accent} />}
            label="Patients"
            value={stats.totalPatients}
            accentColor={colors.accent}
          />
          <View style={{ width: 10 }} />
          <StatsCard
            icon={<AlertTriangle size={18} color={colors.warning} />}
            label="Low Stock"
            value={stats.lowStock}
            accentColor={colors.warning}
          />
        </View>

        {/* Payment Alerts */}
        {urgentPayments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PaymentTracker')}>
                <Text style={[styles.viewAll, { color: colors.secondary }]}>View All</Text>
              </TouchableOpacity>
            </View>

            {urgentPayments.map((entry) => (
              <View
                key={entry.id}
                style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.paymentInfo}>
                  <Text style={[styles.paymentRep, { color: colors.text }]}>{entry.repName}</Text>
                  <Text style={[styles.paymentCompany, { color: colors.textSecondary }]}>
                    {entry.companyName} — {entry.medicineName}
                  </Text>
                  <Text style={[styles.paymentAmount, { color: colors.text }]}>
                    {formatCurrency(entry.remaining)}
                  </Text>
                </View>
                <CountdownBadge
                  dueDate={entry.paymentDueDate?.toDate ? entry.paymentDueDate.toDate() : new Date(entry.paymentDueDate)}
                />
              </View>
            ))}
          </View>
        )}

        {/* Outstanding Summary */}
        {stats.totalOutstanding > 0 && (
          <View style={[styles.outstandingCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
            <View style={styles.outstandingLeft}>
              <Clock size={18} color={colors.danger} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.outstandingLabel, { color: colors.textSecondary }]}>
                  Total Outstanding
                </Text>
                <Text style={[styles.outstandingAmount, { color: colors.danger }]}>
                  {formatCurrency(stats.totalOutstanding)}
                </Text>
              </View>
            </View>
            <Text style={[styles.pendingCount, { color: colors.textSecondary }]}>
              {stats.pendingPayments} pending
            </Text>
          </View>
        )}

        {/* Recent Prescriptions */}
        {recentPrescriptions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Prescriptions</Text>
            </View>
            {recentPrescriptions.map((rx) => (
              <TouchableOpacity
                key={rx.id}
                style={[styles.rxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: rx.id })}
              >
                <View style={[styles.rxIcon, { backgroundColor: colors.tint + '15' }]}>
                  <FileText size={16} color={colors.tint} />
                </View>
                <View style={styles.rxInfo}>
                  <Text style={[styles.rxPatient, { color: colors.text }]}>{rx.patientName}</Text>
                  <Text style={[styles.rxMeta, { color: colors.textSecondary }]}>
                    {rx.items?.length || 0} medicines — {formatCurrency(rx.totalAmount || 0)}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: 160,
    gap: 4,
  },
  clinicBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentRep: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentCompany: {
    fontSize: 12,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  outstandingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  outstandingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outstandingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  outstandingAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  pendingCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  rxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rxIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rxInfo: {
    flex: 1,
  },
  rxPatient: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  rxMeta: {
    fontSize: 12,
  },
});
