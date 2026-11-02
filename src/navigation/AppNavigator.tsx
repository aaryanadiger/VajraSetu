import React from 'react';
import { Easing } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { CaptureFlowScreen } from '../screens/CaptureFlowScreen';
import { WorkerHistoryScreen } from '../screens/WorkerHistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CleanBottomTabBar } from '../components/CleanBottomTabBar';

// ─── Stack param lists ────────────────────────────────────────────────────────

export type HomeStackParamList = {
  HomeMain: undefined;
  Settings: undefined;
};

export type CaptureStackParamList = {
  CaptureMain: { workerId?: string };
};

export type HistoryStackParamList = {
  HistoryMain: { workerId?: string; workerName?: string } | undefined;
};

// ─── Stack Navigators ─────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CaptureStack = createNativeStackNavigator<CaptureStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
    </HomeStack.Navigator>
  );
}

function CaptureStackNavigator() {
  return (
    <CaptureStack.Navigator screenOptions={{ headerShown: false }}>
      <CaptureStack.Screen name="CaptureMain" component={CaptureFlowScreen} />
    </CaptureStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryMain" component={WorkerHistoryScreen} />
    </HistoryStack.Navigator>
  );
}

// ─── App Navigator ────────────────────────────────────────────────────────────

export const AppNavigator: React.FC = () => {
  const reduced = useReducedMotion();
  return (
    <Tab.Navigator
      tabBar={props => <CleanBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#ECF3ED' },
        animation: reduced ? 'none' : 'fade',
        transitionSpec: { animation: 'timing', config: { duration: reduced ? 0 : 240, easing: Easing.out(Easing.cubic) } },
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Scan" component={CaptureStackNavigator} />
      <Tab.Screen name="History" component={HistoryStackNavigator} />
    </Tab.Navigator>
  );
};
