import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { hasPinSet, setPin, verifyPin } from '../services/auth';
import { useAuth } from '../navigation/RootNavigator';

const PIN_LENGTH = 4;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'] as const;

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [pin, setLocalPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))).current;

  useEffect(() => {
    hasPinSet().then(has => setIsSetup(!has));
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  function shake() {
    setLocalPin('');
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function animateDot(index: number, filled: boolean) {
    Animated.spring(dotAnims[index], {
      toValue: filled ? 1 : 0,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }

  async function handleDigit(digit: number | null | 'del') {
    setError('');
    if (digit === 'del') {
      if (pin.length > 0) {
        animateDot(pin.length - 1, false);
        setLocalPin(p => p.slice(0, -1));
      }
      return;
    }
    if (digit === null) return;
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + digit;
    animateDot(newPin.length - 1, true);
    setLocalPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      await processPin(newPin);
    }
  }

  async function processPin(enteredPin: string) {
    if (isSetup) {
      // First-time setup
      if (!confirmStep) {
        setConfirmStep(true);
        setLocalPin('');
        setConfirmPin(enteredPin);
        dotAnims.forEach(a => a.setValue(0));
      } else {
        if (enteredPin === confirmPin) {
          await setPin(enteredPin);
          login();
        } else {
          setError('PINs do not match. Try again.');
          setConfirmStep(false);
          setConfirmPin('');
          dotAnims.forEach(a => a.setValue(0));
          shake();
        }
      }
    } else {
      const ok = await verifyPin(enteredPin);
      if (ok) {
        login();
      } else {
        setError('Incorrect PIN');
        shake();
        dotAnims.forEach(a => a.setValue(0));
      }
    }
  }

  if (isSetup === null) return null; // loading

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#dce8f8', '#b8d0f0', '#a0c4ee']}
        style={styles.bg}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>Vajra सेतु</Text>
            <Text style={styles.subtitle}>H₂S Exposure Monitor</Text>
          </View>

          {/* PIN card */}
          <View style={styles.card}>
            <View style={styles.lockIcon}>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>
              {isSetup
                ? confirmStep ? 'Confirm your PIN' : 'Create your PIN'
                : 'Safety Officer Login'}
            </Text>
            <Text style={styles.cardSub}>
              {isSetup
                ? confirmStep
                  ? 'Enter your PIN again to confirm'
                  : 'Set a 4-digit PIN to protect access'
                : 'Enter your 4-digit PIN'}
            </Text>

            {/* PIN dots */}
            <Animated.View
              style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
            >
              {dotAnims.map((anim, i) => {
                const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
                const bg = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.colors.semantic.neutral, theme.colors.primary],
                });
                return (
                  <Animated.View
                    key={i}
                    style={[styles.dot, { backgroundColor: bg, transform: [{ scale }] }]}
                  />
                );
              })}
            </Animated.View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Numeric pad */}
          <View style={styles.pad}>
            {DIGITS.map((digit, i) => {
              if (digit === null) return <View key={i} style={styles.padEmpty} />;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.padKey}
                  onPress={() => handleDigit(digit)}
                  activeOpacity={0.7}
                >
                  {digit === 'del' ? (
                    <Ionicons name="backspace-outline" size={24} color={theme.colors.text.primary} />
                  ) : (
                    <Text style={styles.padDigit}>{digit}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.footer}>Vajra सेतु · SIH26118</Text>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: theme.spacing.xl,
  },
  logoSection: { alignItems: 'center', gap: theme.spacing.xs },
  logo: {
    fontFamily: theme.typography.family.logo,
    fontSize: 40,
    color: theme.colors.text.primary,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xxl,
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  cardSub: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  errorText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.semantic.danger,
    textAlign: 'center',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '80%',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  padKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  padEmpty: { width: 72, height: 72 },
  padDigit: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: 24,
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  footer: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
    opacity: 0.6,
  },
});
