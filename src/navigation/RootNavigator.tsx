import React, { createContext, useContext, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { AppNavigator } from './AppNavigator';
import { getSessionActive, clearSession } from '../services/auth';

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Stack Types ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Root Navigator ───────────────────────────────────────────────────────────

export const RootNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(getSessionActive());

  const login = useCallback(() => setIsAuthenticated(true), []);
  const logout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
};
