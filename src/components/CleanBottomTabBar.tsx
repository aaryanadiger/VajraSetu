import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { theme } from '../theme';

const ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Scan: { active: 'scan', inactive: 'scan-outline' },
  History: { active: 'time', inactive: 'time-outline' },
} as const;

export const CleanBottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    if (reduced) { position.setValue(state.index); return; }
    const animation = Animated.timing(position, { toValue: state.index, duration: 240,
      easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [state.index, reduced, position]);
  const itemWidth = Math.max(0, (width - 16) / state.routes.length);
  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12),
      left: Math.max(insets.left, 16), right: Math.max(insets.right, 16) }]}>
      <View style={styles.shell} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <BlurView pointerEvents="none" intensity={Platform.OS === 'ios' ? 55 : 30}
          tint="light" style={StyleSheet.absoluteFill} />
        {width > 0 && <Animated.View pointerEvents="none" style={[styles.selection, { width: itemWidth,
          transform: [{ translateX: Animated.multiply(position, itemWidth) }] }]} />}
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const icon = ICONS[route.name as keyof typeof ICONS] ?? ICONS.Home;
          return <TouchableOpacity key={route.key} accessibilityRole="tab"
            accessibilityState={{ selected }} accessibilityLabel={route.name}
            testID={`tab-${route.name}`} activeOpacity={0.7} style={styles.item}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}>
            <Ionicons name={selected ? icon.active : icon.inactive} size={24} color={selected ? '#245F5B' : '#718580'} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{route.name}</Text>
          </TouchableOpacity>;
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', borderRadius: 30, shadowColor: '#173D39',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
  shell: { minHeight: 74, borderRadius: 30, overflow: 'hidden', flexDirection: 'row',
    alignItems: 'center', padding: 7, backgroundColor: 'rgba(238,245,240,0.88)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  selection: { position: 'absolute', top: 7, bottom: 7, left: 7, borderRadius: 23,
    backgroundColor: 'rgba(36,95,91,0.11)' },
  item: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: theme.typography.family.medium, fontSize: 11, color: '#718580' },
  selectedLabel: { color: '#245F5B', fontFamily: theme.typography.family.semiBold },
});
