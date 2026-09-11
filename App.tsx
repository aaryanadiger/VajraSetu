import React, { useEffect, useState } from 'react';
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
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(e => {
        console.error('[App] DB init failed', e);
        setDbError(String(e));
        // Allow app to proceed — screens will handle missing data gracefully
        setDbReady(true);
      });
  }, []);

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
});
