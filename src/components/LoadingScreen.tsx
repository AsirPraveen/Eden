import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

type LoadingScreenProps = {
  message?: string;
};

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  const { colors } = useTheme();

  return (
    <LinearGradient colors={colors.linearGradient} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Eden</Text>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 32,
  },
  loader: {
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
});

export default LoadingScreen;
