import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';

const ACTIVE_COLOR = '#245F5B';
const INACTIVE_COLOR = '#7E8D89';

const TAB_ICON = {
  Home: { active: 'home', inactive: 'home-outline' },
  Scan: { active: 'scan', inactive: 'scan-outline' },
  History: { active: 'time', inactive: 'time-outline' },
} as const;

export const CleanBottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => (
  <View style={styles.container}>
    <BlurView
      intensity={Platform.OS === 'ios' ? 88 : 58}
      tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : 'light'}
      style={styles.glassShell}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.72)', 'rgba(228,240,234,0.32)', 'rgba(255,248,239,0.52)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.94, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.topRefraction} />
      <View pointerEvents="none" style={styles.sideGlow} />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icon = TAB_ICON[route.name as keyof typeof TAB_ICON] ?? TAB_ICON.Home;
        const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={route.name}
            testID={`tab-${route.name}`}
            onPress={onPress}
            activeOpacity={0.72}
            style={[styles.navItem, isFocused && styles.navItemActive]}
          >
            {isFocused && <View pointerEvents="none" style={styles.activeHighlight} />}
            <Ionicons name={isFocused ? icon.active : icon.inactive} size={25} color={color} />
            <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 14 : 12,
    left: 16,
    right: 16,
    borderRadius: 32,
    backgroundColor: 'transparent',
    shadowColor: '#173D39',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 16,
  },
  glassShell: {
    minHeight: 74,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(241,247,243,0.34)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  topRefraction: {
    position: 'absolute',
    top: 1,
    left: 24,
    right: 24,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  sideGlow: {
    position: 'absolute',
    right: -20,
    top: -34,
    width: 130,
    height: 96,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  navItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#245F5B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 13,
    elevation: 3,
  },
  activeHighlight: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  navLabel: {
    fontFamily: theme.typography.family.medium,
    fontSize: 11,
    color: INACTIVE_COLOR,
  },
  navLabelActive: {
    color: ACTIVE_COLOR,
    fontFamily: theme.typography.family.semiBold,
  },
});
