import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import Svg, { Path, Rect, Line, Polyline } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';

const ACTIVE_COLOR = '#2b96ff';
const INACTIVE_COLOR = '#9CA3AF';

export const CleanBottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  return (
    <View style={styles.container}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 72 : 48}
        tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : 'light'}
        style={styles.navBar}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.66)', 'rgba(241,248,255,0.30)', 'rgba(255,255,255,0.46)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.glassGlow} />
        <View pointerEvents="none" style={styles.glassHighlight} />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={route.name}
              testID={`tab-${route.name}`}
              onPress={onPress}
              activeOpacity={0.7}
              style={[styles.navItem, isFocused && styles.navItemActive]}
            >
              {route.name === 'Home' && (
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <Path
                    d="M9 21V12h6v9"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}

              {route.name === 'Scan' && (
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  {/* Top Left Finder */}
                  <Rect
                    x="2.5"
                    y="2.5"
                    width="7.5"
                    height="7.5"
                    rx="1.5"
                    stroke={color}
                    strokeWidth="1.8"
                  />
                  <Rect
                    x="4.5"
                    y="4.5"
                    width="3.5"
                    height="3.5"
                    rx="0.5"
                    fill={color}
                  />

                  {/* Top Right Finder */}
                  <Rect
                    x="14"
                    y="2.5"
                    width="7.5"
                    height="7.5"
                    rx="1.5"
                    stroke={color}
                    strokeWidth="1.8"
                  />
                  <Rect
                    x="16"
                    y="4.5"
                    width="3.5"
                    height="3.5"
                    rx="0.5"
                    fill={color}
                  />

                  {/* Bottom Left Finder */}
                  <Rect
                    x="2.5"
                    y="14"
                    width="7.5"
                    height="7.5"
                    rx="1.5"
                    stroke={color}
                    strokeWidth="1.8"
                  />
                  <Rect
                    x="4.5"
                    y="16"
                    width="3.5"
                    height="3.5"
                    rx="0.5"
                    fill={color}
                  />

                  {/* Bottom Right QR Data Pattern */}
                  <Line x1="14" y1="14" x2="21.5" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="14" y1="17.5" x2="21.5" y2="17.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="14" y1="21.5" x2="21.5" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="14" y1="14" x2="14" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="21.5" y1="14" x2="21.5" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="17.75" y1="14" x2="17.75" y2="17.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
              )}

              {route.name === 'History' && (
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  {/* Counter-clockwise arrow */}
                  <Polyline
                    points="1 4 1 10 7 10"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Circular clock path */}
                  <Path
                    d="M3.51 15a9 9 0 1 0 .49-4.95"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Clock hands */}
                  <Polyline
                    points="12 7 12 12 15 14"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>{route.name === 'Scan' ? 'Scan' : route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 14 : 12,
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
    borderRadius: 30,
    shadowColor: '#0B2038',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 14,
  },
  navBar: {
    backgroundColor: 'rgba(244, 249, 255, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.74)',
    borderRadius: 30,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 9,
  },
  glassGlow: {
    position: 'absolute',
    width: 130,
    height: 90,
    borderRadius: 65,
    right: -16,
    top: -48,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  glassHighlight: {
    position: 'absolute', top: 1, left: 22, right: 22, height: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 2,
    borderRadius: 18,
    marginHorizontal: 5,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    shadowColor: '#2B96FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  navLabel: {
    fontFamily: theme.typography.family.medium,
    fontSize: 11,
    color: INACTIVE_COLOR,
  },
  navLabelActive: {
    color: ACTIVE_COLOR,
  },
});
