import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Badge } from './ui/Badge';
import { Worker, Reading, RiskBand } from '../types';

interface WorkerListItemProps {
  worker: Worker;
  latestReading?: Reading;
  onPress?: () => void;
}

function riskToBadgeVariant(band: RiskBand) {
  switch (band) {
    case 'low': return 'success';
    case 'elevated': return 'warning';
    case 'high': return 'danger';
    case 'invalid': return 'neutral';
    default: return 'info';
  }
}

function riskLabel(band: RiskBand): string {
  switch (band) {
    case 'low': return 'LOW';
    case 'elevated': return 'ELEVATED';
    case 'high': return 'HIGH';
    case 'invalid': return 'INVALID BAND';
    default: return 'NO READING';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export const WorkerListItem: React.FC<WorkerListItemProps> = ({ worker, latestReading, onPress }) => {
  const band = latestReading?.risk_band;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.initials}>{getInitials(worker.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{worker.name}</Text>
        <Text style={styles.code}>{worker.worker_code}</Text>
      </View>

      {/* Right side */}
      <View style={styles.right}>
        {latestReading ? (
          <>
            <Badge
              label={band ? riskLabel(band) : 'NO READING'}
              variant={band ? riskToBadgeVariant(band) : 'info'}
            />
            {latestReading.band_valid && (
              <Text style={styles.twa}>{latestReading.twa_ppm.toFixed(2)} ppm</Text>
            )}
          </>
        ) : (
          <Text style={styles.noReading}>Not scanned</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.light} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  initials: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.md,
    color: theme.colors.primary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  code: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  twa: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  noReading: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.light,
    fontStyle: 'italic',
  },
});
