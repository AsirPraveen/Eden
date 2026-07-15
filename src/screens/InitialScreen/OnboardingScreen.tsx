import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, profile, loading } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleGetStarted = async () => {
    try {
      setChecking(true);

      if (user && profile) {
        // User is already logged in
        if (profile.clinicIds && profile.clinicIds.length > 0 && profile.activeClinicId) {
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
        return;
      }

      // Not logged in, go to login
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      navigation.navigate('Login');
    } finally {
      setChecking(false);
    }
  };

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Top decorative elements */}
          <View style={styles.decorTop}>
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
          </View>

          {/* Center content */}
          <View style={styles.center}>
            <View style={styles.iconContainer}>
              <View style={styles.iconOuter}>
                <Leaf size={48} color="#fff" strokeWidth={1.5} />
              </View>
            </View>

            <Text style={styles.title}>Eden</Text>
            <Text style={styles.subtitle}>
              Manage your clinic inventory, prescriptions, and medical rep payments — all in one place.
            </Text>
          </View>

          {/* Bottom action */}
          <View style={styles.bottom}>
            <TouchableOpacity
              onPress={handleGetStarted}
              disabled={loading || checking}
              style={[styles.getStartedBtn, { backgroundColor: '#fff' }]}
              activeOpacity={0.85}
            >
              {loading || checking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={[styles.btnText, { color: colors.primary }]}>Get Started</Text>
                  <ArrowRight size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Your data stays private and secure
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  decorTop: {
    position: 'relative',
    height: 60,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -80,
    right: -60,
  },
  decorCircle2: {
    width: 120,
    height: 120,
    top: -20,
    left: -40,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 28,
  },
  iconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 52,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  bottom: {
    alignItems: 'center',
  },
  getStartedBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
  },
});
