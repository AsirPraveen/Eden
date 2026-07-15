import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Phone, Calendar, Droplets, FileText, Trash2,
  AlertCircle, ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { formatDate, formatCurrency, toDate } from '../../utils/helpers';
import {
  doc, getDoc, deleteDoc, collection, query, where, getDocs, orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function PatientDetailsScreen({ navigation, route }: any) {
  const { patientId } = route.params;
  const { colors } = useTheme();
  const { activeClinic } = useClinic();

  const [patient, setPatient] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const clinicId = activeClinic.id;
      const patDoc = await getDoc(doc(db, 'clinics', clinicId, 'patients', patientId));
      if (patDoc.exists()) {
        setPatient({ id: patDoc.id, ...patDoc.data() });
      }

      const rxQ = query(
        collection(db, 'clinics', clinicId, 'prescriptions'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const rxSnap = await getDocs(rxQ);
      const rxList: any[] = [];
      rxSnap.forEach((d) => rxList.push({ id: d.id, ...d.data() }));
      setPrescriptions(rxList);
    } catch (err) {
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClinic?.id, patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Patient', `Delete "${patient?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'clinics', activeClinic!.id, 'patients', patientId));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (!patient) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Patient</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        {/* Patient Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>
              {patient.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>

          <View style={styles.detailsGrid}>
            {patient.phone ? (
              <View style={styles.detailRow}>
                <Phone size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{patient.phone}</Text>
              </View>
            ) : null}
            {patient.age ? (
              <View style={styles.detailRow}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{patient.age} years — {patient.gender || 'N/A'}</Text>
              </View>
            ) : null}
            {patient.bloodGroup ? (
              <View style={styles.detailRow}>
                <Droplets size={14} color={colors.danger} />
                <Text style={[styles.detailText, { color: colors.text }]}>{patient.bloodGroup}</Text>
              </View>
            ) : null}
            {patient.allergies ? (
              <View style={styles.detailRow}>
                <AlertCircle size={14} color={colors.warning} />
                <Text style={[styles.detailText, { color: colors.text }]}>{patient.allergies}</Text>
              </View>
            ) : null}
          </View>

          {patient.notes ? (
            <View style={[styles.notesBox, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{patient.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{patient.visitCount || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visits</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{prescriptions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Prescriptions</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatCurrency(prescriptions.reduce((s, rx) => s + (rx.totalAmount || 0), 0))}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Billed</Text>
          </View>
        </View>

        {/* Quick Action */}
        <TouchableOpacity
          style={[styles.rxBtn, { backgroundColor: colors.secondary }]}
          onPress={() => navigation.navigate('PrescriptionForm', { patientId })}
        >
          <FileText size={16} color="#fff" />
          <Text style={styles.rxBtnText}>New Prescription</Text>
        </TouchableOpacity>

        {/* Prescription History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescription History</Text>
          {prescriptions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No prescriptions yet.
            </Text>
          ) : (
            prescriptions.map((rx) => (
              <TouchableOpacity
                key={rx.id}
                style={[styles.rxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: rx.id })}
              >
                <View style={[styles.rxIcon, { backgroundColor: colors.tint + '15' }]}>
                  <FileText size={16} color={colors.tint} />
                </View>
                <View style={styles.rxInfo}>
                  <Text style={[styles.rxDiag, { color: colors.text }]}>
                    {rx.diagnosis || 'General Consultation'}
                  </Text>
                  <Text style={[styles.rxMeta, { color: colors.textSecondary }]}>
                    {rx.items?.length || 0} medicines — {formatCurrency(rx.totalAmount || 0)}
                  </Text>
                  <Text style={[styles.rxDate, { color: colors.textSecondary }]}>
                    {rx.createdAt ? formatDate(toDate(rx.createdAt)) : ''}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
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
  avatar: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '700' },
  patientName: { fontSize: 22, fontWeight: '700', marginBottom: 14 },
  detailsGrid: { width: '100%', gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14 },
  notesBox: { width: '100%', padding: 12, borderRadius: 10, marginTop: 14 },
  notesLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '500' },
  rxBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 46, borderRadius: 12, gap: 6, marginBottom: 20,
  },
  rxBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  rxCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  rxIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rxInfo: { flex: 1 },
  rxDiag: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rxMeta: { fontSize: 12, marginBottom: 2 },
  rxDate: { fontSize: 11 },
});
