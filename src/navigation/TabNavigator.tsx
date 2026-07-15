import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Keyboard } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import {
  LayoutDashboard,
  Package,
  FileText,
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

type TabIconProps = {
  active: boolean;
};

const TabIcons: Record<string, (props: TabIconProps) => React.ReactNode> = {
  Home: ({ active }) => {
    const { colors } = useTheme();
    return <LayoutDashboard size={24} color={active ? colors.upGradient : colors.textSecondary} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Inventory: ({ active }) => {
    const { colors } = useTheme();
    return <Package size={24} color={active ? colors.upGradient : colors.textSecondary} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Reps: ({ active }) => {
    const { colors } = useTheme();
    return <Handshake size={24} color={active ? colors.upGradient : colors.textSecondary} strokeWidth={active ? 2.2 : 1.8} />;
  },
  Profile: ({ active }) => {
    const { colors } = useTheme();
    return <UserCircle size={24} color={active ? colors.upGradient : colors.textSecondary} strokeWidth={active ? 2.2 : 1.8} />;
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

// Animated tab bar — same SVG bubble pattern from Bible app
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
  const [layout, dispatch] = useReducer(reducer, []);

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

  useEffect(() => {
    if (layout.length === routes.length) {
      const activeLayout = layout.find((item: any) => item.index === activeIndex);
      if (activeLayout) {
        xOffset.value = activeLayout.x - 25;
      }
    }
  }, [activeIndex, layout, routes.length]);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(xOffset.value, { duration: 250 }) }],
  }));

  return (
    <View style={[styles.tabBar, { height: 60 + bottom, backgroundColor: colors.background }]}>
      <AnimatedSvg
        width={110}
        height={60}
        viewBox="0 0 110 60"
        style={[styles.activeBackground, animatedStyles]}
      >
        <Path
          fill={colors.downGradient}
          d="M20 0H0c11.046 0 20 8.953 20 20v5c0 19.33 15.67 35 35 35s35-15.67 35-35v-5c0-11.045 8.954-20 20-20H20z"
        />
      </AnimatedSvg>

      <View style={styles.tabBarContainer}>
        {routes.map((route, index) => {
          const active = index === activeIndex;
          const { options } = descriptors[route.key];
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
        style={[styles.componentCircle, animatedCircle, { backgroundColor: colors.background }]}
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
});

export default HomeTabsNavigation;
