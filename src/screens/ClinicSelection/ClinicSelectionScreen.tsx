import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, MapPin, Phone, FileText, Plus, ArrowLeft, LogOut, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { cleanDoctorName } from '../../utils/helpers';

export default function ClinicSelectionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { logout, profile } = useAuth();
  const { clinics, loading, switchClinic, createClinic } = useClinic();

  const [showCreate, setShowCreate] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [regNo, setRegNo] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateClinic = async () => {
    if (!clinicName.trim()) {
      Alert.alert('Error', 'Please enter a clinic name.');
      return;
    }

    try {
      setCreating(true);
      await createClinic(clinicName.trim(), address.trim(), phone.trim(), regNo.trim());
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create clinic.');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectClinic = async (clinicId: string) => {
    const success = await switchClinic(clinicId);
    if (success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const hasClinics = clinics.length > 0;

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Welcome, {cleanDoctorName(profile?.name).split(' ')[0] || 'Doctor'}
            </Text>
            <Text style={styles.headerSub}>
              {hasClinics
                ? 'Select a clinic to continue or create a new one.'
                : 'Create your first clinic to get started.'}
            </Text>
          </View>

          {/* Existing Clinics */}
          {hasClinics && !showCreate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Clinics</Text>
              {clinics.map((clinic) => (
                <TouchableOpacity
                  key={clinic.id}
                  style={[styles.clinicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleSelectClinic(clinic.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.clinicIcon, { backgroundColor: colors.secondary + '15' }]}>
                    <Building2 size={22} color={colors.secondary} />
                  </View>
                  <View style={styles.clinicInfo}>
                    <Text style={[styles.clinicName, { color: colors.text }]}>{clinic.name}</Text>
                    {clinic.address ? (
                      <Text style={[styles.clinicAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                        {clinic.address}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Create Clinic Form */}
          {(showCreate || !hasClinics) && (
            <View style={[styles.createCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {hasClinics && (
                <TouchableOpacity
                  onPress={() => setShowCreate(false)}
                  style={styles.backRow}
                >
                  <ArrowLeft size={18} color={colors.textSecondary} />
                  <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to list</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.formIcon, { backgroundColor: colors.secondary + '15' }]}>
                <Building2 size={28} color={colors.secondary} />
              </View>
              <Text style={[styles.formTitle, { color: colors.text }]}>New Clinic</Text>

              {/* Clinic Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Clinic Name <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Building2 size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={clinicName}
                    onChangeText={setClinicName}
                    placeholder="e.g., Grace Clinic"
                    placeholderTextColor={colors.textSecondary + '80'}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Address</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <MapPin size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Street, City, State"
                    placeholderTextColor={colors.textSecondary + '80'}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Phone</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Phone size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Clinic phone number"
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Registration No */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Doctor Reg. No.</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <FileText size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={regNo}
                    onChangeText={setRegNo}
                    placeholder="Medical council registration"
                    placeholderTextColor={colors.textSecondary + '80'}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                onPress={handleCreateClinic}
                disabled={creating}
                style={styles.createBtn}
              >
                <LinearGradient
                  colors={colors.linearGradient}
                  style={styles.createGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Plus size={18} color="#fff" />
                      <Text style={styles.createText}>Create Clinic</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Add New Clinic button (when list is shown) */}
          {hasClinics && !showCreate && (
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={[styles.addNewBtn, { borderColor: colors.textLight + '30' }]}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.addNewText}>Create New Clinic</Text>
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 28,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  clinicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clinicAddress: {
    fontSize: 13,
  },
  createCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backText: {
    fontSize: 14,
  },
  formIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  createBtn: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  createGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 24,
  },
  addNewText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
});
