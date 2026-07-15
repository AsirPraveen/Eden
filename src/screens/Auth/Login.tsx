import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          if (profileData.clinicIds && profileData.clinicIds.length > 0 && profileData.activeClinicId) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'ClinicSelection' }],
            });
          }
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ClinicSelection' }],
          });
        }
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ClinicSelection' }],
        });
      }
    } catch (error: any) {
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>Eden</Text>
              <Text style={styles.tagline}>Your clinic, simplified.</Text>
            </View>

            {/* Form Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome back</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Sign in to continue managing your clinic
              </Text>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="doctor@example.com"
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary + '80'}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotBtn}
              >
                <Text style={[styles.forgotText, { color: colors.secondary }]}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginBtn}
              >
                <LinearGradient
                  colors={colors.linearGradient}
                  style={styles.loginGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Register link */}
              <View style={styles.registerRow}>
                <Text style={[styles.registerLabel, { color: colors.textSecondary }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[styles.registerLink, { color: colors.secondary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
    fontWeight: '400',
  },
  card: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
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
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLabel: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
