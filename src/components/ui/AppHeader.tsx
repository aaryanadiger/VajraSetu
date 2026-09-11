import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  onTranslatePress?: () => void;
  onAvatarPress?: () => void;
  avatarUri?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onTranslatePress, onAvatarPress, avatarUri }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Vajra सेतु</Text>
      
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton} onPress={onTranslatePress}>
          <Ionicons name="language-outline" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.avatarContainer} onPress={onAvatarPress}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color={theme.colors.text.inverse} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.md,
  },
  logo: {
    fontFamily: theme.typography.family.logo,
    fontSize: theme.typography.size.xxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    padding: theme.spacing.xs,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
    borderColor: theme.colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
