import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { saveAccountProfile } from '../services/db';
import { useAuth } from '../navigation/RootNavigator';

/** First-run profile creation. This device is assigned to one worker only. */
export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [workerCode, setWorkerCode] = useState('');
  const [siteId, setSiteId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function continueToApp() {
    if (!name.trim() || !workerCode.trim() || !siteId.trim()) {
      setError('Enter your name, worker ID, and site to continue.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveAccountProfile({ name, worker_code: workerCode, site_id: siteId });
      login();
    } catch {
      setError('That worker ID is already in use on this device. Check it and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#FAF4EA', '#E8F1EB', '#CFE2DA']} style={styles.background} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              <View style={styles.logoLockup}>
                <Image source={require('../../assets/logo.png')} style={styles.logoMark} resizeMode="contain" />
                <Text style={styles.logo}>Vajra सेतु</Text>
              </View>
              <Text style={styles.subtitle}>Your H₂S exposure record</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.iconCircle}><Ionicons name="person-outline" size={25} color={theme.colors.primary} /></View>
              <Text style={styles.title}>Set up your profile</Text>
              <Text style={styles.description}>This phone keeps one private wristband record for its worker. No password is needed.</Text>

              <View style={styles.fieldGroup}>
                <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Meera Sharma" autoCapitalize="words" returnKeyType="next" />
                <Field label="Worker ID" value={workerCode} onChangeText={setWorkerCode} placeholder="e.g. WKR-1042" autoCapitalize="characters" returnKeyType="next" />
                <Field label="Site / factory" value={siteId} onChangeText={setSiteId} placeholder="e.g. Surat Plant" autoCapitalize="words" returnKeyType="done" onSubmitEditing={continueToApp} />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={[styles.continueButton, saving && styles.continueButtonDisabled]} onPress={continueToApp} disabled={saving} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.continueText}>{saving ? 'Saving profile…' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.footer}>Stored only on this device</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const Field: React.FC<React.ComponentProps<typeof TextInput> & { label: string }> = ({ label, ...props }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...props} style={styles.input} placeholderTextColor="#98A2B3" accessibilityLabel={label} />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  background: { flex: 1 },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 },
  brand: { alignItems: 'center' },
  logoLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 46, height: 46 },
  logo: { fontFamily: theme.typography.family.logo, fontSize: 39, color: theme.colors.text.primary, letterSpacing: -1.3 },
  subtitle: { marginTop: 6, fontFamily: theme.typography.family.main, fontSize: 14, color: theme.colors.text.secondary },
  card: { width: '100%', backgroundColor: 'rgba(255,253,248,0.94)', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#385F59', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.11, shadowRadius: 24, elevation: 8 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: theme.typography.family.semiBold, fontSize: 23, letterSpacing: -0.4, color: theme.colors.text.primary },
  description: { marginTop: 7, fontFamily: theme.typography.family.main, fontSize: 13, color: theme.colors.text.secondary, lineHeight: 19 },
  fieldGroup: { gap: 13, marginTop: 22 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: theme.typography.family.medium, fontSize: 13, color: theme.colors.text.primary },
  input: { minHeight: 50, backgroundColor: '#F7F5EF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 14, fontFamily: theme.typography.family.main, fontSize: 15, color: theme.colors.text.primary },
  error: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#B42318', marginTop: 12, lineHeight: 17 },
  continueButton: { minHeight: 54, borderRadius: 16, backgroundColor: theme.colors.primary, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueButtonDisabled: { opacity: 0.6 },
  continueText: { fontFamily: theme.typography.family.semiBold, fontSize: 16, color: '#fff' },
  footer: { alignSelf: 'center', fontFamily: theme.typography.family.main, fontSize: 12, color: theme.colors.text.secondary },
});
