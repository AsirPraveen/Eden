import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  UserCircle, Settings, FileText, Package, Users, CreditCard,
  ChevronRight, BarChart3, Clock,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toDate, cleanDoctorName } from '../../utils/helpers';
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { activeClinic, clinicRole, clinics } = useClinic();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    totalPatients: 0,
    totalMedicines: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!activeClinic?.id) return;
    const clinicId = activeClinic.id;

    try {
      // Prescriptions count
      const rxSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'prescriptions')
      );
      let totalRev = 0;
      rxSnap.forEach((d) => {
        totalRev += d.data().totalAmount || 0;
      });

      // Patients count
      const patientSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'patients')
      );

      // Medicines count
      const medSnap = await getDocs(
        collection(db, 'clinics', clinicId, 'medicines')
      );

      // Outstanding
      const payQ = query(
        collection(db, 'clinics', clinicId, 'stockEntries'),
        where('paymentStatus', 'in', ['unpaid', 'partial'])
      );
      const paySnap = await getDocs(payQ);
      let outstanding = 0;
      paySnap.forEach((d) => {
        const data = d.data();
        outstanding += (data.totalAmount || 0) - (data.paidAmount || 0);
      });

      setStats({
        totalPrescriptions: rxSnap.size,
        totalPatients: patientSnap.size,
        totalMedicines: medSnap.size,
        totalRevenue: totalRev,
        totalOutstanding: outstanding,
      });
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    }
  }, [activeClinic?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const menuItems = [
    {
      icon: <FileText size={18} color={colors.tint} />,
      label: 'Prescriptions',
      subtitle: `${stats.totalPrescriptions} total`,
      onPress: () => navigation.navigate('PrescriptionHistory'),
      bg: colors.tint + '12',
    },
    {
      icon: <Users size={18} color={colors.accent} />,
      label: 'Patients',
      subtitle: `${stats.totalPatients} registered`,
      onPress: () => navigation.navigate('PatientList'),
      bg: colors.accent + '12',
    },
    {
      icon: <BarChart3 size={18} color={colors.secondary} />,
      label: 'Analytics',
      subtitle: 'Revenue, inventory & more',
      onPress: () => navigation.navigate('Analytics'),
      bg: colors.secondary + '12',
    },
    {
      icon: <Settings size={18} color={colors.textSecondary} />,
      label: 'Settings',
      subtitle: 'Clinic, theme & printer',
      onPress: () => navigation.navigate('Settings'),
      bg: colors.textSecondary + '12',
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Settings size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {cleanDoctorName(profile?.name).charAt(0).toUpperCase() || 'D'}
              </Text>
            </View>
            <Text style={styles.profileName}>{profile?.name || 'Doctor'}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            {profile?.licenseNo ? (
              <Text style={styles.profileLicense}>Reg. No: {profile.licenseNo}</Text>
            ) : null}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {(clinicRole || 'member').charAt(0).toUpperCase() + (clinicRole || 'member').slice(1)} • {activeClinic?.name || 'No Clinic'}
              </Text>
            </View>
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
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revenue</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: stats.totalOutstanding > 0 ? colors.danger : colors.success }]}>
              {formatCurrency(stats.totalOutstanding)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Outstanding</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                {item.icon}
              </View>
              <View style={styles.menuInfo}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Clinics */}
        {clinics.length > 1 && (
          <View style={styles.clinicsSection}>
            <Text style={[styles.clinicsSectionTitle, { color: colors.textSecondary }]}>YOUR CLINICS</Text>
            {clinics.map((clinic) => (
              <View
                key={clinic.id}
                style={[
                  styles.clinicItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: clinic.id === activeClinic?.id ? colors.secondary : colors.border,
                    borderWidth: clinic.id === activeClinic?.id ? 1.5 : 1,
                  },
                ]}
              >
                <View style={[styles.clinicDot, { backgroundColor: clinic.id === activeClinic?.id ? colors.secondary : colors.textSecondary }]} />
                <View style={styles.clinicInfo}>
                  <Text style={[styles.clinicName, { color: colors.text }]}>{clinic.name}</Text>
                  {clinic.address ? (
                    <Text style={[styles.clinicAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                      {clinic.address}
                    </Text>
                  ) : null}
                </View>
                {clinic.id === activeClinic?.id && (
                  <View style={[styles.activeBadge, { backgroundColor: colors.secondary + '15' }]}>
                    <Text style={[styles.activeText, { color: colors.secondary }]}>Active</Text>
                  </View>
                )}
              </View>
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
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  profileCard: { alignItems: 'center', paddingVertical: 12 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  profileLicense: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 5, borderRadius: 16,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  content: { padding: 16, paddingTop: 16 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },

  // Menu
  menuSection: { gap: 8, marginBottom: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  menuSubtitle: { fontSize: 12 },

  // Clinics
  clinicsSection: { marginTop: 4 },
  clinicsSectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.5,
    marginBottom: 8, paddingLeft: 4,
  },
  clinicItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, marginBottom: 8,
  },
  clinicDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  clinicAddr: { fontSize: 12 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeText: { fontSize: 11, fontWeight: '700' },
});
