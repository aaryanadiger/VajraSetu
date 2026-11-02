import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const ScreenTransition: React.FC<React.PropsWithChildren> = ({ children }) => {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 240,
      easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, progress]);
  return <Animated.View style={{ flex: 1, opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
};
