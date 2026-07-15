import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Building2, FileText, Bell, Moon, Sun, Printer,
  ChevronRight, LogOut, Shield, Info, Database, Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { cancelAllNotifications } from '../../services/NotificationService';
import { cleanDoctorName } from '../../utils/helpers';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();
  const { activeClinic } = useClinic();

  // Clinic settings state
  const [prescriptionHeader, setPrescriptionHeader] = useState('');
  const [prescriptionFooter, setPrescriptionFooter] = useState('');
  const [editingClinic, setEditingClinic] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (activeClinic?.settings) {
      setPrescriptionHeader(activeClinic.settings.prescriptionHeader || activeClinic.name);
      setPrescriptionFooter(activeClinic.settings.prescriptionFooter || 'Get well soon!');
    }
  }, [activeClinic]);

  const handleSaveClinicSettings = async () => {
    if (!activeClinic?.id) return;
    try {
      await updateDoc(doc(db, 'clinics', activeClinic.id), {
        'settings.prescriptionHeader': prescriptionHeader,
        'settings.prescriptionFooter': prescriptionFooter,
      });
      setEditingClinic(false);
      Alert.alert('Saved', 'Clinic settings updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save settings.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const handleClearNotifications = () => {
    Alert.alert(
      'Clear Notifications',
      'This will cancel all scheduled notification reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            Alert.alert('Done', 'All scheduled notifications cleared.');
          },
        },
      ]
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const SettingsRow = ({
    icon,
    label,
    value,
    onPress,
    danger,
    rightElement,
    showChevron = true,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text>
        ) : null}
        {rightElement || null}
        {showChevron && onPress && <ChevronRight size={16} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Summary */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.secondary }]}>
              {cleanDoctorName(profile?.name).charAt(0).toUpperCase() || 'D'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{profile?.name || 'Doctor'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{profile?.email}</Text>
            {profile?.licenseNo ? (
              <Text style={[styles.profileLicense, { color: colors.textSecondary }]}>
                Reg: {profile.licenseNo}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Clinic Settings */}
        <Section title="CLINIC">
          <SettingsRow
            icon={<Building2 size={18} color={colors.secondary} />}
            label="Clinic Name"
            value={activeClinic?.name || 'Not set'}
            showChevron={false}
          />
          <SettingsRow
            icon={<Building2 size={18} color={colors.secondary} />}
            label="Address"
            value={activeClinic?.address || 'Not set'}
            showChevron={false}
          />
          {activeClinic?.doctorRegNo ? (
            <SettingsRow
              icon={<Shield size={18} color={colors.secondary} />}
              label="Registration No."
              value={activeClinic.doctorRegNo}
              showChevron={false}
            />
          ) : null}
          <SettingsRow
            icon={<Users size={18} color={colors.secondary} />}
            label="Switch / Manage Clinics"
            onPress={() => navigation.navigate('ClinicSelection')}
          />
        </Section>

        {/* Prescription Template */}
        <Section title="PRESCRIPTION TEMPLATE">
          {editingClinic ? (
            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Header Text</Text>
              <TextInput
                style={[styles.editInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                value={prescriptionHeader}
                onChangeText={setPrescriptionHeader}
                placeholder="Clinic name or header..."
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Footer Text</Text>
              <TextInput
                style={[styles.editInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                value={prescriptionFooter}
                onChangeText={setPrescriptionFooter}
                placeholder="Get well soon!"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setEditingClinic(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.secondary }]}
                  onPress={handleSaveClinicSettings}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <SettingsRow
                icon={<FileText size={18} color={colors.accent} />}
                label="Header"
                value={prescriptionHeader || 'Not set'}
                onPress={() => setEditingClinic(true)}
              />
              <SettingsRow
                icon={<FileText size={18} color={colors.accent} />}
                label="Footer"
                value={prescriptionFooter || 'Get well soon!'}
                onPress={() => setEditingClinic(true)}
              />
            </>
          )}
        </Section>

        {/* Appearance */}
        <Section title="APPEARANCE">
          <SettingsRow
            icon={theme === 'dark' ? <Moon size={18} color={colors.accent} /> : <Sun size={18} color={colors.accent} />}
            label="Dark Mode"
            showChevron={false}
            rightElement={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.secondary + '50' }}
                thumbColor={theme === 'dark' ? colors.secondary : colors.textSecondary}
              />
            }
          />
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingsRow
            icon={<Bell size={18} color={colors.warning} />}
            label="Payment Reminders"
            showChevron={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.secondary + '50' }}
                thumbColor={notificationsEnabled ? colors.secondary : colors.textSecondary}
              />
            }
          />
          <SettingsRow
            icon={<Bell size={18} color={colors.warning} />}
            label="Clear All Reminders"
            onPress={handleClearNotifications}
          />
        </Section>

        {/* Printer */}
        <Section title="PRINTING">
          <SettingsRow
            icon={<Printer size={18} color={colors.tint} />}
            label="Printer"
            value="System Print (WiFi/AirPrint)"
            showChevron={false}
          />
          <View style={[styles.hintRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Bluetooth thermal printer support requires an Expo dev build. Current mode uses the system print dialog.
            </Text>
          </View>
        </Section>

        {/* Data */}
        <Section title="DATA">
          <SettingsRow
            icon={<Database size={18} color={colors.secondary} />}
            label="Data Storage"
            value="Firebase Cloud"
            showChevron={false}
          />
          <View style={[styles.hintRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              All data is securely stored in Google Firebase with automatic backups. Offline mode syncs when you're back online.
            </Text>
          </View>
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <SettingsRow
            icon={<Info size={18} color={colors.textSecondary} />}
            label="Version"
            value="1.0.0"
            showChevron={false}
          />
          <SettingsRow
            icon={<Shield size={18} color={colors.textSecondary} />}
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be hosted online and linked here.')}
          />
        </Section>

        {/* Logout */}
        <Section title="ACCOUNT">
          <SettingsRow
            icon={<LogOut size={18} color={colors.danger} />}
            label="Logout"
            onPress={handleLogout}
            danger
          />
        </Section>

        <View style={{ height: 40 }} />
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
  backBtn: { padding: 4, width: 30 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  profileEmail: { fontSize: 13, marginBottom: 1 },
  profileLicense: { fontSize: 12, fontStyle: 'italic' },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.5,
    marginBottom: 8, paddingLeft: 4,
  },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '45%' },
  rowValue: { fontSize: 13, textAlign: 'right' },

  // Hint
  hintRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  hintText: { fontSize: 12, lineHeight: 17 },

  // Editing
  editSection: { padding: 16 },
  editLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  editInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, marginBottom: 14,
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
