import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Printer, FileText } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, formatDateTime, toDate } from '../../utils/helpers';
import { printPrescription } from '../../services/PrintService';
import { SignaturePreview } from '../../components/SignaturePad';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function PrescriptionDetailScreen({ navigation, route }: any) {
  const { prescriptionId } = route.params;
  const { colors } = useTheme();
  const { activeClinic } = useClinic();
  const [rx, setRx] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!activeClinic?.id) return;
      const rxDoc = await getDoc(
        doc(db, 'clinics', activeClinic.id, 'prescriptions', prescriptionId)
      );
      if (rxDoc.exists()) {
        setRx({ id: rxDoc.id, ...rxDoc.data() });
      }
    };
    fetch();
  }, [activeClinic?.id, prescriptionId]);

  const handlePrint = async () => {
    if (!rx || !activeClinic) return;
    try {
      await printPrescription(rx, activeClinic);
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Failed to print.');
    }
  };

  if (!rx) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Prescription</Text>
        <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
          <Printer size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Clinic Header */}
        <View style={[styles.rxHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.clinicName, { color: colors.text }]}>
            {activeClinic?.name}
          </Text>
          {activeClinic?.address ? (
            <Text style={[styles.clinicAddr, { color: colors.textSecondary }]}>
              {activeClinic.address}
            </Text>
          ) : null}
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Patient Info */}
          <View style={styles.patientRow}>
            <View style={styles.patientCol}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Patient</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>{rx.patientName}</Text>
            </View>
            {rx.patientAge && (
              <View style={styles.patientCol}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age/Gender</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {rx.patientAge}{rx.patientGender ? `/${rx.patientGender.charAt(0)}` : ''}
                </Text>
              </View>
            )}
            {rx.patientPhone && (
              <View style={styles.patientCol}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{rx.patientPhone}</Text>
              </View>
            )}
          </View>

          {rx.diagnosis && (
            <View style={styles.diagRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>{rx.diagnosis}</Text>
            </View>
          )}

          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {rx.createdAt ? formatDateTime(toDate(rx.createdAt)) : ''}
          </Text>
          <Text style={[styles.doctorText, { color: colors.textSecondary }]}>
            Dr. {rx.doctorName}
          </Text>
          {rx.signatureData ? (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <SignaturePreview pathData={rx.signatureData} height={50} width={200} />
            </View>
          ) : null}
        </View>

        {/* Medicines Table */}
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medicines</Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.thText, styles.thName, { color: colors.textSecondary }]}>#</Text>
            <Text style={[styles.thText, styles.thMed, { color: colors.textSecondary }]}>Medicine</Text>
            <Text style={[styles.thText, styles.thSmall, { color: colors.textSecondary }]}>Qty</Text>
            <Text style={[styles.thText, styles.thSmall, { color: colors.textSecondary }]}>Amt</Text>
          </View>

          {(rx.items || []).map((item: any, idx: number) => (
            <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.tdText, styles.thName, { color: colors.textSecondary }]}>{idx + 1}</Text>
              <View style={styles.thMed}>
                <Text style={[styles.tdMedName, { color: colors.text }]}>{item.medicineName}</Text>
                <Text style={[styles.tdDosage, { color: colors.textSecondary }]}>
                  {item.dosage} — {item.timing} — {item.duration} days
                </Text>
                {item.instructions ? (
                  <Text style={[styles.tdInstructions, { color: colors.textSecondary }]}>
                    {item.instructions}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.tdText, styles.thSmall, { color: colors.text }]}>{item.quantity}</Text>
              <Text style={[styles.tdText, styles.thSmall, { color: colors.text }]}>
                {formatCurrency(item.amount || 0)}
              </Text>
            </View>
          ))}

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: colors.divider }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatCurrency(rx.totalAmount || 0)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {rx.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{rx.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {activeClinic?.settings?.prescriptionFooter || 'Get well soon!'}
          </Text>
        </View>

        {/* Print Button */}
        <TouchableOpacity
          style={[styles.printFullBtn, { backgroundColor: colors.secondary }]}
          onPress={handlePrint}
        >
          <Printer size={18} color="#fff" />
          <Text style={styles.printFullText}>Print Prescription</Text>
        </TouchableOpacity>
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
  printBtn: { padding: 4, width: 40, alignItems: 'flex-end' },
  content: { padding: 16, paddingBottom: 40 },
  rxHeader: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  clinicName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  clinicAddr: { fontSize: 12, marginBottom: 10 },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  patientRow: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 8 },
  patientCol: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
  diagRow: { width: '100%', marginTop: 6 },
  dateText: { fontSize: 12, marginTop: 10 },
  doctorText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tableCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  thText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  thName: { width: 28 },
  thMed: { flex: 1 },
  thSmall: { width: 50, textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, alignItems: 'flex-start' },
  tdText: { fontSize: 13 },
  tdMedName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tdDosage: { fontSize: 11, marginBottom: 1 },
  tdInstructions: { fontSize: 11, fontStyle: 'italic' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  notesCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  notesText: { fontSize: 13, lineHeight: 18 },
  footer: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, marginBottom: 16 },
  footerText: { fontSize: 14, fontStyle: 'italic' },
  printFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: 12, gap: 8,
  },
  printFullText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
