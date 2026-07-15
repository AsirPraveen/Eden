import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Handshake, Plus, Phone, Building2, CreditCard, ChevronRight,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import CountdownBadge from '../../components/CountdownBadge';
import { formatCurrency, toDate } from '../../utils/helpers';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function RepsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [reps, setReps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [outstandingMap, setOutstandingMap] = useState<Record<string, { amount: number; nearestDue: Date | null }>>({});

  const fetchReps = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const q = query(
        collection(db, 'clinics', activeClinic.id, 'reps'),
        orderBy('name', 'asc')
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setReps(list);

      // Fetch outstanding amounts per rep
      const payQ = query(
        collection(db, 'clinics', activeClinic.id, 'stockEntries'),
        where('paymentStatus', 'in', ['unpaid', 'partial'])
      );
      const paySnap = await getDocs(payQ);
      const map: Record<string, { amount: number; nearestDue: Date | null }> = {};
      paySnap.forEach((d) => {
        const data = d.data();
        const repId = data.repId;
        if (!repId) return;
        const remaining = (data.totalAmount || 0) - (data.paidAmount || 0);
        const dueDate = data.paymentDueDate
          ? (data.paymentDueDate.toDate ? data.paymentDueDate.toDate() : new Date(data.paymentDueDate))
          : null;

        if (!map[repId]) {
          map[repId] = { amount: 0, nearestDue: null };
        }
        map[repId].amount += remaining;
        if (dueDate && (!map[repId].nearestDue || dueDate < map[repId].nearestDue!)) {
          map[repId].nearestDue = dueDate;
        }
      });
      setOutstandingMap(map);
    } catch (err) {
      console.error('Error fetching reps:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchReps();
    }, [fetchReps])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReps();
    setRefreshing(false);
  };

  const filtered = reps.filter((rep) => {
    const q = searchQuery.toLowerCase();
    return (
      rep.name?.toLowerCase().includes(q) ||
      rep.company?.toLowerCase().includes(q) ||
      rep.phone?.includes(searchQuery)
    );
  });

  const totalOutstanding = Object.values(outstandingMap).reduce((s, v) => s + v.amount, 0);

  const renderRep = ({ item }: { item: any }) => {
    const outstanding = outstandingMap[item.id];
    const hasOutstanding = outstanding && outstanding.amount > 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('RepDetails', { repId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardBody}>
          <View style={[styles.avatar, { backgroundColor: colors.accent + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.repInfo}>
            <Text style={[styles.repName, { color: colors.text }]}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Building2 size={11} color={colors.textSecondary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.company}</Text>
            </View>
            {item.phone ? (
              <View style={styles.metaRow}>
                <Phone size={11} color={colors.textSecondary} />
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.phone}</Text>
              </View>
            ) : null}
            {item.visitDay ? (
              <Text style={[styles.visitDay, { color: colors.secondary }]}>
                Visits: {item.visitDay}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardRight}>
            {hasOutstanding ? (
              <>
                <Text style={[styles.outstandingAmt, { color: colors.danger }]}>
                  {formatCurrency(outstanding.amount)}
                </Text>
                <Text style={[styles.outstandingLabel, { color: colors.textSecondary }]}>outstanding</Text>
                {outstanding.nearestDue && (
                  <View style={{ marginTop: 4 }}>
                    <CountdownBadge dueDate={outstanding.nearestDue} compact />
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.clearBadge, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.clearText, { color: colors.success }]}>Clear</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Medical Reps</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate('PaymentTracker')}
              >
                <CreditCard size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate('AddRep')}
              >
                <Plus size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search reps by name, company..."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Outstanding Summary */}
      {totalOutstanding > 0 && (
        <TouchableOpacity
          style={[styles.outstandingBar, { backgroundColor: colors.danger + '08', borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('PaymentTracker')}
          activeOpacity={0.7}
        >
          <View style={styles.outstandingBarLeft}>
            <CreditCard size={16} color={colors.danger} />
            <Text style={[styles.outstandingBarLabel, { color: colors.textSecondary }]}>
              Total Outstanding
            </Text>
          </View>
          <View style={styles.outstandingBarRight}>
            <Text style={[styles.outstandingBarAmt, { color: colors.danger }]}>
              {formatCurrency(totalOutstanding)}
            </Text>
            <ChevronRight size={14} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderRep}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Handshake size={48} color={colors.textSecondary} />}
              title="No medical reps yet"
              subtitle="Add your medical representatives to track purchases and payments."
              action={
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => navigation.navigate('AddRep')}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Rep</Text>
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
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  searchWrap: { paddingHorizontal: 16 },
  outstandingBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  outstandingBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outstandingBarLabel: { fontSize: 13, fontWeight: '500' },
  outstandingBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outstandingBarAmt: { fontSize: 16, fontWeight: '800' },
  list: { padding: 16, paddingTop: 12 },
  card: {
    borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14, overflow: 'hidden',
  },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  repInfo: { flex: 1 },
  repName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 },
  meta: { fontSize: 12 },
  visitDay: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  outstandingAmt: { fontSize: 14, fontWeight: '700' },
  outstandingLabel: { fontSize: 10, fontWeight: '500' },
  clearBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clearText: { fontSize: 12, fontWeight: '700' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
