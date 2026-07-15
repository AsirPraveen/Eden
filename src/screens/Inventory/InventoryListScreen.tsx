import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Plus, AlertTriangle, Filter } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/helpers';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Medicine } from '../../types';

export default function InventoryListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [medicines, setMedicines] = useState<(Medicine & { id: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchMedicines = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const q = query(
        collection(db, 'clinics', activeClinic.id, 'medicines'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      const list: (Medicine & { id: string })[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Medicine & { id: string });
      });
      setMedicines(list);
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  };

  const filtered = medicines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderItem = ({ item }: { item: Medicine & { id: string } }) => {
    const isLowStock = item.currentStock <= (item.reorderLevel || 10);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('MedicineDetails', { medicineId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category, colors) }]} />
          <View style={styles.cardInfo}>
            <Text style={[styles.medName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.medCategory, { color: colors.textSecondary }]}>
              {item.category} — {item.unit}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.stockRow}>
            {isLowStock && <AlertTriangle size={12} color={colors.warning} style={{ marginRight: 4 }} />}
            <Text style={[styles.stockCount, { color: isLowStock ? colors.warning : colors.text }]}>
              {item.currentStock}
            </Text>
          </View>
          <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>in stock</Text>
          <Text style={[styles.price, { color: colors.secondary }]}>
            {formatCurrency(item.sellingPrice)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.linearGradient} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Inventory</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddMedicine')}
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search medicines..."
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<Package size={48} color={colors.textSecondary} />}
              title="No medicines yet"
              subtitle="Add medicines to your inventory to get started."
              action={
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => navigation.navigate('AddMedicine')}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Medicine</Text>
                </TouchableOpacity>
              }
            />
          ) : null
        }
      />
    </View>
  );
}

const getCategoryColor = (category: string, colors: any): string => {
  const map: Record<string, string> = {
    Tablets: '#3B82F6',
    Capsules: '#8B5CF6',
    Syrups: '#F59E0B',
    Injections: '#EF4444',
    Ointments: '#10B981',
    Drops: '#06B6D4',
    Surgical: '#6366F1',
    Others: '#9CA3AF',
  };
  return map[category] || colors.secondary;
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
    paddingTop: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 8,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  medCategory: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  stockLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
