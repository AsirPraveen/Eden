import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Keyboard, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import {
  LayoutDashboard,
  Package,
  FilePlus2,
  Handshake,
  UserCircle,
} from 'lucide-react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import InventoryListScreen from '../screens/Inventory/InventoryListScreen';
import RepsScreen from '../screens/MedicalReps/RepsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// Dummy component for the FAB tab (never actually rendered)
function PrescribePlaceholder() {
  return <View />;
}

type TabIconProps = {
  active: boolean;
};

const TabIcons: Record<string, (props: TabIconProps) => React.ReactNode> = {
  Home: ({ active }) => {
    const { colors } = useTheme();
    return <LayoutDashboard size={24} color={active ? colors.upGradient : colors.tabIconNonActive} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Inventory: ({ active }) => {
    const { colors } = useTheme();
    return <Package size={24} color={active ? colors.upGradient : colors.tabIconNonActive} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Reps: ({ active }) => {
    const { colors } = useTheme();
    return <Handshake size={24} color={active ? colors.upGradient : colors.tabIconNonActive} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Profile: ({ active }) => {
    const { colors } = useTheme();
    return <UserCircle size={24} color={active ? colors.upGradient : colors.tabIconNonActive} strokeWidth={active ? 2.2 : 1.8} />;
  },
};

const HomeTabsNavigation = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }: any) => TabIcons.Home({ active: focused }),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryListScreen}
        options={{
          tabBarIcon: ({ focused }: any) => TabIcons.Inventory({ active: focused }),
        }}
      />
      <Tab.Screen
        name="Prescribe"
        component={PrescribePlaceholder}
        options={{
          tabBarIcon: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent navigating to the placeholder screen
            e.preventDefault();
            // Navigate to the PrescriptionForm in the parent stack
            navigation.navigate('PrescriptionForm');
          },
        })}
      />
      <Tab.Screen
        name="Reps"
        component={RepsScreen}
        options={{
          tabBarIcon: ({ focused }: any) => TabIcons.Reps({ active: focused }),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }: any) => TabIcons.Profile({ active: focused }),
        }}
      />
    </Tab.Navigator>
  );
};

// Animated tab bar with center FAB
const AnimatedTabBar = ({
  state: { index: activeIndex, routes },
  navigation,
  descriptors,
}: BottomTabBarProps) => {
  const { bottom } = useSafeAreaInsets();
  const { colors } = useTheme();

  const reducer = (state: any, action: any) => {
    const existingIndex = state.findIndex((item: any) => item.index === action.index);
    if (existingIndex > -1) {
      const newState = [...state];
      newState[existingIndex] = { x: action.x, index: action.index };
      return newState;
    }
    return [...state, { x: action.x, index: action.index }];
  };
  const [layoutData, dispatch] = useReducer(reducer, []);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleLayout = (event: any, index: number) => {
    if (!keyboardVisible) {
      dispatch({ x: event.nativeEvent.layout.x, index });
    }
  };

  const xOffset = useSharedValue(0);

  // Map actual active index to visual index (skip center FAB at index 2)
  const visualActiveIndex = activeIndex > 2 ? activeIndex : activeIndex;

  useEffect(() => {
    // Don't move bubble to the FAB position (index 2)
    if (activeIndex === 2) return;
    if (layoutData.length === routes.length) {
      const activeLayout = layoutData.find((item: any) => item.index === activeIndex);
      if (activeLayout) {
        xOffset.value = activeLayout.x - 25;
      }
    }
  }, [activeIndex, layoutData, routes.length]);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(xOffset.value, { duration: 250 }) }],
  }));

  return (
    <View style={[styles.tabBar, { height: 60 + bottom, backgroundColor: colors.primary }]}>
      <AnimatedSvg
        width={110}
        height={60}
        viewBox="0 0 110 60"
        style={[styles.activeBackground, animatedStyles]}
      >
        <Path
          fill={colors.background}
          d="M20 0H0c11.046 0 20 8.953 20 20v5c0 19.33 15.67 35 35 35s35-15.67 35-35v-5c0-11.045 8.954-20 20-20H20z"
        />
      </AnimatedSvg>

      <View style={styles.tabBarContainer}>
        {routes.map((route, index) => {
          const active = index === activeIndex;
          const { options } = descriptors[route.key];
          const isFab = index === 2; // Center position is FAB

          if (isFab) {
            return (
              <FABButton
                key={route.key}
                onPress={() => navigation.navigate('PrescriptionForm' as any)}
                onLayout={(e: any) => handleLayout(e, index)}
                colors={colors}
              />
            );
          }

          return (
            <TabBarComponent
              key={route.key}
              active={active}
              options={options}
              onLayout={(e: any) => handleLayout(e, index)}
              onPress={() => navigation.navigate(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
};

// Center FAB button
const FABButton = ({ onPress, onLayout, colors }: any) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  return (
    <View style={styles.fabWrapper} onLayout={onLayout}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() => { scale.value = 0.9; }}
          onPressOut={() => { scale.value = 1; }}
          activeOpacity={0.9}
          style={styles.fabTouchable}
        >
          <LinearGradient
            colors={[colors.secondary, colors.accent || colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <FilePlus2 size={26} color="#fff" strokeWidth={2.2} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const TabBarComponent = ({ active, options, onLayout, onPress }: any) => {
  const { colors } = useTheme();

  const animatedCircle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(active ? 1 : 0, { duration: 250 }) }],
  }));

  const animatedIcon = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.5, { duration: 250 }),
  }));

  return (
    <Pressable onPress={onPress} onLayout={onLayout} style={styles.component}>
      <Animated.View
        style={[styles.componentCircle, animatedCircle, { backgroundColor: colors.secondary }]}
      />
      <Animated.View style={[styles.iconContainer, animatedIcon]}>
        {options.tabBarIcon ? options.tabBarIcon({ focused: active }) : null}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabBar: { backgroundColor: 'white' },
  activeBackground: { position: 'absolute' },
  tabBarContainer: { flexDirection: 'row', justifyContent: 'space-evenly' },
  component: { height: 60, width: 60, marginTop: -5 },
  componentCircle: { flex: 1, borderRadius: 30, backgroundColor: 'white' },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FAB styles
  fabWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -28, // Elevate above tab bar
  },
  fabTouchable: {
    width: 58,
    height: 58,
    borderRadius: 29,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeTabsNavigation;
