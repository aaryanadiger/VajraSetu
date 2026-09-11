/**
 * SegmentedBar — matches the landing page's 50-segment gradient exposure bar.
 * Animated fill with gradient fade at the leading edge.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';

interface SegmentedBarProps {
  /** Value between 0 and max */
  value: number;
  /** Max value (default 100) */
  max?: number;
  /** Threshold position (0–1 fraction, default 0.5 = 50%) */
  thresholdFraction?: number;
  /** Number of segments (default 50) */
  segments?: number;
  /** Height of each segment (default 18) */
  height?: number;
}

export const SegmentedBar: React.FC<SegmentedBarProps> = ({
  value,
  max = 100,
  thresholdFraction = 0.5,
  segments = 50,
  height = 18,
}) => {
  const fraction = Math.min(Math.max(value / max, 0), 1);
  const filledCount = Math.round(fraction * segments);

  function getSegmentColor(i: number): string {
    if (i >= filledCount) return theme.colors.semantic.neutral;

    const ratio = i / Math.max(filledCount - 1, 1);

    if (ratio < 0.4) return '#1e6fff';
    if (ratio < 0.65) return '#3d8fff';
    if (ratio < 0.82) return '#60aaff';

    // Gradient fade at the leading edge
    const fade = (ratio - 0.82) / 0.18;
    const r = Math.round(96 + fade * 100);
    const g = Math.round(170 + fade * 25);
    return `rgb(${r},${g},255)`;
  }

  return (
    <View style={[styles.bar, { height }]}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            { height, backgroundColor: getSegmentColor(i) },
          ]}
        />
      ))}
      {/* Threshold marker */}
      <View
        style={[
          styles.marker,
          { left: `${thresholdFraction * 100}%`, top: -4, bottom: -4 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  seg: {
    flex: 1,
    borderRadius: 2.5,
  },
  marker: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#8fa8c8',
    borderRadius: 1,
  },
});
