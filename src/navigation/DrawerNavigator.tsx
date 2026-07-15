import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  Moon,
  Sun,
  Users,
  FileText,
} from 'lucide-react-native';
import { MaterialCommunityIcons as Icon, Ionicons } from '@expo/vector-icons';

import HomeTabsNavigation from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useClinic } from '../context/ClinicContext';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: any) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const { activeClinic, clinics } = useClinic();

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        {/* User Info Header */}
        <View style={drawerStyles.userHeader}>
          <View style={drawerStyles.userAvatar}>
            <Text style={drawerStyles.userInitial}>
              {profile?.name?.charAt(0)?.toUpperCase() || 'D'}
            </Text>
          </View>
          <Text style={[drawerStyles.userName, { color: colors.textLight }]}>
            {profile?.name || 'Doctor'}
          </Text>
          <Text style={[drawerStyles.userEmail, { color: 'rgba(255,255,255,0.6)' }]}>
            {profile?.email}
          </Text>
          {activeClinic && (
            <View style={drawerStyles.clinicBadge}>
              <Text style={drawerStyles.clinicBadgeText}>{activeClinic.name}</Text>
            </View>
          )}
        </View>

        <View style={[drawerStyles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

        <DrawerItemList {...props} />

        {/* Quick Actions */}
        <View style={[drawerStyles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={drawerStyles.quickSection}>
          <View style={drawerStyles.sectionHeader}>
            <Icon name="lightning-bolt" size={16} color={colors.secondary} />
            <Text style={[drawerStyles.sectionTitle, { color: colors.secondary }]}>
              Quick Actions
            </Text>
          </View>
          <TouchableOpacity
            style={drawerStyles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('PrescriptionForm');
            }}
          >
            <FileText size={16} color="rgba(255,255,255,0.7)" />
            <Text style={drawerStyles.quickItemText}>New Prescription</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={drawerStyles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('AddMedicine');
            }}
          >
            <Icon name="pill" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={drawerStyles.quickItemText}>Add Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={drawerStyles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('AddPatient');
            }}
          >
            <Users size={16} color="rgba(255,255,255,0.7)" />
            <Text style={drawerStyles.quickItemText}>Add Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Clinic list */}
        {clinics.length > 1 && (
          <View style={drawerStyles.clinicSection}>
            <View style={[drawerStyles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
            <View style={drawerStyles.sectionHeader}>
              <Icon name="hospital-building" size={16} color={colors.secondary} />
              <Text style={[drawerStyles.sectionTitle, { color: colors.secondary }]}>
                Clinics
              </Text>
            </View>
            {clinics.map((clinic) => (
              <View key={clinic.id} style={drawerStyles.clinicItem}>
                <View style={[
                  drawerStyles.clinicDot,
                  { backgroundColor: clinic.id === activeClinic?.id ? colors.secondary : 'rgba(255,255,255,0.3)' }
                ]} />
                <Text
                  style={[
                    drawerStyles.clinicName,
                    { color: clinic.id === activeClinic?.id ? colors.secondary : colors.textLight },
                  ]}
                  numberOfLines={1}
                >
                  {clinic.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </DrawerContentScrollView>

      {/* Theme Toggle Footer */}
      <View style={drawerStyles.footer}>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={drawerStyles.themeBtn}
        >
          {theme === 'dark' ? (
            <Moon size={22} color={colors.textLight} />
          ) : (
            <Sun size={22} color={colors.textLight} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DrawerNavigator = () => {
  const { colors } = useTheme();

  const drawerIcon = ({ focused, size }: any, name: any) => (
    <Icon name={name} size={size} color={focused ? colors.secondary : colors.textLight} />
  );

  const lucideDrawerIcon = (focused: boolean, IconComponent: any) => (
    <IconComponent size={22} color={focused ? colors.secondary : colors.textLight} />
  );

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textLight,
        drawerHideStatusBarOnOpen: Platform.OS === 'ios',
        overlayColor: 'transparent',
        drawerStyle: {
          backgroundColor: colors.primary,
          width: '75%',
        },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={HomeTabsNavigation}
        options={{
          drawerIcon: (options) => drawerIcon(options, 'view-dashboard-outline'),
        }}
      />
    </Drawer.Navigator>
  );
};

const drawerStyles = StyleSheet.create({
  userHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 10,
  },
  clinicBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clinicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  quickSection: {
    marginTop: 4,
    paddingHorizontal: 6,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  quickItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  clinicSection: {
    marginTop: 4,
    paddingHorizontal: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clinicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  clinicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  clinicName: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DrawerNavigator;
