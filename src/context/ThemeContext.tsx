import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

export type ColorsType = {
  theme: ThemeType;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  textSecondary: string;
  border: string;
  cardBg: string;
  tint: string;
  inputBg: string;
  loader: string;
  divider: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  linearGradient: [string, string, ...string[]];
  downGradient: string;
  upGradient: string;
  tabIconNonActive: string;
  glassBackground: string;
  glassBorder: string;
  neonAccent: string;
};

export const colorsConfig: Record<ThemeType, ColorsType> = {
  light: {
    theme: 'light',
    primary: '#1B4D3E',
    secondary: '#2E8B6E',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textLight: '#F8F9FA',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    cardBg: '#FFFFFF',
    tint: '#1B4D3E',
    inputBg: '#F3F4F6',
    loader: '#1B4D3E',
    divider: '#E5E7EB',
    accent: '#D4A574',
    danger: '#DC3545',
    warning: '#F59E0B',
    success: '#10B981',
    linearGradient: ['#1B4D3E', '#2E8B6E'],
    downGradient: '#2E8B6E',
    upGradient: '#1B4D3E',
    tabIconNonActive: '#F8F9FA',
    glassBackground: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    neonAccent: '#2E8B6E',
  },
  dark: {
    theme: 'dark',
    primary: '#0F2A1F',
    secondary: '#2E8B6E',
    background: '#0D1117',
    surface: '#161B22',
    text: '#E6EDF3',
    textLight: '#E6EDF3',
    textSecondary: '#8B949E',
    border: '#21262D',
    cardBg: '#161B22',
    tint: '#3FB88C',
    inputBg: '#1C2128',
    loader: '#3FB88C',
    divider: '#21262D',
    accent: '#C9985A',
    danger: '#F85149',
    warning: '#D29922',
    success: '#3FB950',
    linearGradient: ['#0A1A12', '#132F1F'],
    downGradient: '#132F1F',
    upGradient: '#0A1A12',
    tabIconNonActive: '#8B949E',
    glassBackground: 'rgba(22, 27, 34, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    neonAccent: '#3FB88C',
  },
};

type ThemeContextType = {
  theme: ThemeType;
  colors: ColorsType;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@eden_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextTheme: ThemeType = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem('@eden_theme', nextTheme);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const colors = colorsConfig[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
