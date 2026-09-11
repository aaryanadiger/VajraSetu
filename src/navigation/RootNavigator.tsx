import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { AppNavigator } from './AppNavigator';
import { getAccountProfile, getPreference, setPreference } from '../services/db';
import { AppLanguage, warmTranslationCache } from '../services/translation';

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bho-IN',
  setLanguage: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// ─── Stack Types ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const LANGUAGE_CODES: AppLanguage[] = ['en-IN', 'bho-IN', 'hi-IN', 'mr-IN', 'kn-IN'];

const COMMON_UI_PHRASES = [
  'Your safety check', 'Latest recorded exposure', 'Wristband status', 'Not scanned',
  'Wristband manual', 'Safety guidelines', 'Exposure history', 'No readings yet',
  'Settings', 'Your account', 'Edit account details', 'Data & export',
  'Scan complete', 'Capture wristband', 'Camera access is needed',
];

// ─── Root Navigator ───────────────────────────────────────────────────────────

export const RootNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [language, setLanguageState] = useState<AppLanguage>('bho-IN');

  const login = useCallback(() => setIsAuthenticated(true), []);

  useEffect(() => {
    // This is a single-worker, device-bound app. A local profile is the only
    // gate required after the first onboarding screen.
    Promise.all([getAccountProfile(), getPreference('language')]).then(([profile, savedLanguage]) => {
      if (savedLanguage && LANGUAGE_CODES.includes(savedLanguage as AppLanguage)) setLanguageState(savedLanguage as AppLanguage);
      setIsAuthenticated(Boolean(profile));
    });
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    void setPreference('language', nextLanguage);
  }, []);

  useEffect(() => {
    void warmTranslationCache(language, COMMON_UI_PHRASES);
  }, [language]);

  if (isAuthenticated === null) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login }}>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <Stack.Screen name="App" component={AppNavigator} />
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
};
