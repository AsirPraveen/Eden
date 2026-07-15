import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import OnboardingScreen from '../screens/InitialScreen/OnboardingScreen';
import LoginScreen from '../screens/Auth/Login';
import RegisterScreen from '../screens/Auth/Register';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword';
import ClinicSelectionScreen from '../screens/ClinicSelection/ClinicSelectionScreen';
import DrawerNavigator from './DrawerNavigator';

// Inventory
import AddMedicineScreen from '../screens/Inventory/AddMedicineScreen';
import MedicineDetailsScreen from '../screens/Inventory/MedicineDetailsScreen';
import StockEntryScreen from '../screens/Inventory/StockEntryScreen';

// Patients
import AddPatientScreen from '../screens/Patients/AddPatientScreen';
import PatientListScreen from '../screens/Patients/PatientListScreen';
import PatientDetailsScreen from '../screens/Patients/PatientDetailsScreen';

// Prescriptions
import PrescriptionFormScreen from '../screens/Prescriptions/PrescriptionFormScreen';
import PrescriptionDetailScreen from '../screens/Prescriptions/PrescriptionDetailScreen';
import PrescriptionHistoryScreen from '../screens/Prescriptions/PrescriptionHistoryScreen';

// Medical Reps
import AddRepScreen from '../screens/MedicalReps/AddRepScreen';
import RepDetailsScreen from '../screens/MedicalReps/RepDetailsScreen';
import PaymentTrackerScreen from '../screens/MedicalReps/PaymentTrackerScreen';

// Analytics
import AnalyticsScreen from '../screens/Analytics/AnalyticsScreen';

// Settings
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Stack = createStackNavigator();

const StackNavigation = () => {
  return (
    <Stack.Navigator initialRouteName="Onboarding">
      {/* Auth Flow */}
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClinicSelection"
        component={ClinicSelectionScreen}
        options={{ headerShown: false }}
      />

      {/* Main App */}
      <Stack.Screen
        name="MainApp"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />

      {/* Inventory Screens */}
      <Stack.Screen
        name="AddMedicine"
        component={AddMedicineScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MedicineDetails"
        component={MedicineDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StockEntry"
        component={StockEntryScreen}
        options={{ headerShown: false }}
      />

      {/* Patient Screens */}
      <Stack.Screen
        name="AddPatient"
        component={AddPatientScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PatientList"
        component={PatientListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PatientDetails"
        component={PatientDetailsScreen}
        options={{ headerShown: false }}
      />

      {/* Prescription Screens */}
      <Stack.Screen
        name="PrescriptionForm"
        component={PrescriptionFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrescriptionDetail"
        component={PrescriptionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrescriptionHistory"
        component={PrescriptionHistoryScreen}
        options={{ headerShown: false }}
      />

      {/* Medical Rep Screens */}
      <Stack.Screen
        name="AddRep"
        component={AddRepScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RepDetails"
        component={RepDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PaymentTracker"
        component={PaymentTrackerScreen}
        options={{ headerShown: false }}
      />

      {/* Analytics */}
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: false }}
      />

      {/* Settings */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default StackNavigation;
