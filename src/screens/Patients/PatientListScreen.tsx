import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Plus, Phone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { formatDate, toDate } from '../../utils/helpers';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function PatientListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const q = query(
        collection(db, 'clinics', activeClinic.id, 'patients'),
        orderBy('name', 'asc')
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setPatients(list);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('PatientDetails', { patientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.tint + '15' }]}>
        <Text style={[styles.avatarText, { color: colors.tint }]}>
          {item.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <View style={styles.metaRow}>
          {item.phone ? (
            <View style={styles.metaItem}>
              <Phone size={11} color={colors.textSecondary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.phone}</Text>
            </View>
          ) : null}
          {item.age ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.age} yrs</Text>
          ) : null}
          {item.gender ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.gender}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.visitCount, { color: colors.secondary }]}>{item.visitCount || 0}</Text>
        <Text style={[styles.visitLabel, { color: colors.textSecondary }]}>visits</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Patients</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddPatient')}
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or phone..."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Users size={48} color={colors.textSecondary} />}
              title="No patients yet"
              subtitle="Add patients to start managing visits and prescriptions."
              action={
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => navigation.navigate('AddPatient')}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Patient</Text>
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
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  searchWrap: { paddingHorizontal: 16 },
  list: { padding: 16, paddingTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 12 },
  right: { alignItems: 'center' },
  visitCount: { fontSize: 18, fontWeight: '700' },
  visitLabel: { fontSize: 10, fontWeight: '500' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
