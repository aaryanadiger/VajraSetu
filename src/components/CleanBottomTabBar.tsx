import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Rect, Line, Polyline } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ACTIVE_COLOR = '#2b96ff';
const INACTIVE_COLOR = '#9CA3AF';

export const CleanBottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
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
              style={styles.navItem}
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  navBar: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#98c5fc',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    shadowColor: '#2b96ff',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
