import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { CrimsonText_400Regular } from '@expo-google-fonts/crimson-text';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDB } from './src/services/db';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    CrimsonText_400Regular,
  });

  const [dbReady, setDbReady] = useState(false);
  const [startupError, setStartupError] = useState('');

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(e => {
        console.error('[App] DB init failed', e);
        setStartupError(e instanceof Error ? e.message : 'The local database or calibration could not be loaded.');
      });
  }, []);

  if (startupError) {
    return (
      <View style={styles.splash} accessibilityRole="alert">
        <Text style={styles.errorTitle}>App setup failed</Text>
        <Text style={styles.errorBody}>{startupError}</Text>
        <Text style={styles.errorHint}>Close and reopen the app. If this continues, reinstall this prototype build or contact the project team.</Text>
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>Vajra सेतु</Text>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#e8f1fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    // Fallback font until custom font loads
    fontSize: 36,
    color: theme.colors.text.primary,
  },
  errorTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.semantic.danger, textAlign: 'center' },
  errorBody: { marginTop: 12, fontSize: 15, lineHeight: 21, color: theme.colors.text.primary, textAlign: 'center', maxWidth: 340 },
  errorHint: { marginTop: 12, fontSize: 13, lineHeight: 19, color: theme.colors.text.secondary, textAlign: 'center', maxWidth: 340 },
});
