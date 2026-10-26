import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface ScanBuildMetadata {
  app_version: string;
  build_version: string;
  device_model: string;
  os_name: string;
  os_version: string;
}

/** Snapshot immutable build/device context at the time of a scan. */
export function getScanBuildMetadata(): ScanBuildMetadata {
  const configuredBuild = Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode;

  return {
    app_version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown',
    build_version: Application.nativeBuildVersion ?? String(configuredBuild ?? 'development'),
    device_model: Device.modelName ?? Device.modelId ?? 'unknown',
    os_name: Device.osName ?? Platform.OS,
    os_version: Device.osVersion ?? String(Platform.Version ?? 'unknown'),
  };
}
