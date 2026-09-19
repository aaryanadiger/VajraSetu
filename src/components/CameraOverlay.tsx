import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CameraOverlayProps {
  /** Color of the corner brackets */
  color?: string;
}

/**
 * CameraOverlay — guides the worker to align the small indicator card, not
 * the whole strap. Fixed placement makes colour sampling repeatable without ML.
 * Designed to be placed as an absolute overlay over the camera view.
 */
export const CameraOverlay: React.FC<CameraOverlayProps> = ({ color = '#ffffff' }) => {
  const cornerSize = 36;
  const thickness = 3;
  const borderRadius = 6;

  const corner = (position: object) => (
    <View style={[styles.corner, position]}>
      {/* Horizontal arm */}
      <View
        style={[
          styles.arm,
          styles.horizontal,
          { backgroundColor: color, borderRadius, height: thickness, width: cornerSize },
        ]}
      />
      {/* Vertical arm */}
      <View
        style={[
          styles.arm,
          styles.vertical,
          { backgroundColor: color, borderRadius, width: thickness, height: cornerSize },
        ]}
      />
    </View>
  );

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Inner guide box */}
      <View style={styles.guideBox}>
        {corner({ top: 0, left: 0 })}
        {corner({ top: 0, right: 0, transform: [{ scaleX: -1 }] })}
        {corner({ bottom: 0, left: 0, transform: [{ scaleY: -1 }] })}
        {corner({ bottom: 0, right: 0, transform: [{ scaleX: -1 }, { scaleY: -1 }] })}
        <View style={styles.expiryMarker} />
        <View style={styles.sensingMarker} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  guideBox: {
    width: '62%',
    aspectRatio: 1,
    position: 'relative',
  },
  expiryMarker: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    width: '25%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFD34D',
    opacity: 0.88,
  },
  sensingMarker: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    width: '29%',
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64D2FF',
    opacity: 0.88,
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
  },
  arm: {
    position: 'absolute',
  },
  horizontal: {
    top: 0,
    left: 0,
  },
  vertical: {
    top: 0,
    left: 0,
  },
});
