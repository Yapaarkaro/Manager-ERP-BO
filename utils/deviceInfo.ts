/**
 * Device Information Collection Utility
 * Collects comprehensive device, network, storage, battery, and screen data
 */

import * as Device from 'expo-device';
import { Platform, Dimensions, PixelRatio } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceSnapshot {
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceType?: string;
  deviceYearClass?: number;
  osName?: string;
  osVersion?: string;
  platformApiLevel?: number;

  networkServiceProvider?: string;
  internetServiceProvider?: string;
  networkType?: string;
  wifiName?: string;
  bluetoothName?: string;
  ipAddress?: string;

  deviceId?: string;
  manufacturer?: string;
  totalMemory?: number;
  isDevice?: boolean;
  isEmulator?: boolean;
  isTablet?: boolean;

  screenWidth?: number;
  screenHeight?: number;
  screenScale?: number;
  pixelDensity?: number;

  totalStorage?: number;
  freeStorage?: number;

  batteryLevel?: number;
  batteryState?: string;

  carrierName?: string;
  mobileCountryCode?: string;
  mobileNetworkCode?: string;

  appVersion?: string;
  appBuildNumber?: string;
  expoSdkVersion?: string;
  locale?: string;
  timezone?: string;
}

export async function collectDeviceSnapshot(): Promise<DeviceSnapshot> {
  const snapshot: DeviceSnapshot = {};

  try {
    if (Device.deviceName) snapshot.deviceName = Device.deviceName;
    if (Device.brand) snapshot.deviceBrand = Device.brand;
    if (Device.modelName) snapshot.deviceModel = Device.modelName;
    if (Device.deviceType !== undefined && Device.deviceType !== null)
      snapshot.deviceType = String(Device.deviceType);
    if (Device.deviceYearClass) snapshot.deviceYearClass = Device.deviceYearClass;
    if (Device.osName) snapshot.osName = Device.osName;
    if (Device.osVersion) snapshot.osVersion = Device.osVersion;
    if (Device.platformApiLevel) snapshot.platformApiLevel = Device.platformApiLevel;
    if (Device.manufacturer) snapshot.manufacturer = Device.manufacturer;

    snapshot.isDevice = Device.isDevice ?? false;
    snapshot.isEmulator = !Device.isDevice;
    if (Device.deviceType !== undefined && Device.DeviceType) {
      snapshot.isTablet = Device.deviceType === Device.DeviceType.TABLET;
    }

    // Total RAM
    if (Device.totalMemory) {
      snapshot.totalMemory = Device.totalMemory;
    }

    // Screen dimensions
    const screen = Dimensions.get('screen');
    snapshot.screenWidth = Math.round(screen.width);
    snapshot.screenHeight = Math.round(screen.height);
    snapshot.screenScale = screen.scale;
    snapshot.pixelDensity = PixelRatio.get();

    // Locale & timezone
    try {
      if (typeof Intl !== 'undefined') {
        snapshot.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        snapshot.locale = Intl.DateTimeFormat().resolvedOptions().locale;
      }
    } catch { /* non-critical */ }

    // Device ID
    if (Constants.installationId) {
      snapshot.deviceId = Constants.installationId;
    } else {
      try {
        const storageKey = 'expo_device_id';
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            let deviceId = window.localStorage.getItem(storageKey);
            if (!deviceId) {
              deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              window.localStorage.setItem(storageKey, deviceId);
            }
            snapshot.deviceId = deviceId;
          }
        } else {
          let deviceId = await AsyncStorage.getItem(storageKey);
          if (!deviceId) {
            deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await AsyncStorage.setItem(storageKey, deviceId);
          }
          snapshot.deviceId = deviceId;
        }
      } catch { /* non-critical */ }
    }

    // App info
    if (Constants.expoConfig?.version) snapshot.appVersion = Constants.expoConfig.version;
    if (Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode) {
      snapshot.appBuildNumber = Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber?.toString()
        : Constants.expoConfig?.android?.versionCode?.toString();
    }
    if (Constants.expoConfig?.sdkVersion) snapshot.expoSdkVersion = Constants.expoConfig.sdkVersion;

    // --- Enhanced: Battery ---
    if (Platform.OS !== 'web') {
      try {
        const Battery = require('expo-battery');
        const level = await Battery.getBatteryLevelAsync();
        if (level >= 0) snapshot.batteryLevel = Math.round(level * 100);

        const state = await Battery.getBatteryStateAsync();
        const stateMap: Record<number, string> = {
          0: 'unknown', 1: 'unplugged', 2: 'charging', 3: 'full',
        };
        snapshot.batteryState = stateMap[state] || 'unknown';
      } catch { /* expo-battery may not be available */ }
    }

    // --- Enhanced: Cellular / carrier ---
    if (Platform.OS !== 'web') {
      try {
        const Cellular = require('expo-cellular');
        const carrierName = await Cellular.getCarrierNameAsync();
        if (carrierName) snapshot.carrierName = carrierName;

        const mcc = await Cellular.getMobileCountryCodeAsync();
        if (mcc) snapshot.mobileCountryCode = mcc;

        const mnc = await Cellular.getMobileNetworkCodeAsync();
        if (mnc) snapshot.mobileNetworkCode = mnc;

        snapshot.networkServiceProvider = carrierName || 'Unknown Carrier';
      } catch { /* expo-cellular may not be available */ }
    }

    // --- Enhanced: Network ---
    try {
      const Network = require('expo-network');
      const networkState = await Network.getNetworkStateAsync();
      if (networkState) {
        const typeMap: Record<string, string> = {
          '0': 'none', '1': 'wifi', '2': 'cellular', '3': 'bluetooth', '4': 'ethernet', '5': 'wimax', '6': 'vpn', '99': 'other',
        };
        snapshot.networkType = typeMap[String(networkState.type)] || networkState.type?.toString() || 'unknown';
        snapshot.internetServiceProvider = networkState.isInternetReachable ? 'Connected' : 'Offline';
      }

      if (Platform.OS !== 'web') {
        const ip = await Network.getIpAddressAsync();
        if (ip) snapshot.ipAddress = ip;
      }
    } catch { /* expo-network may not be available */ }

    // --- Enhanced: Storage ---
    if (Platform.OS !== 'web') {
      try {
        const FileSystem = require('expo-file-system');
        const freeBytes = await FileSystem.getFreeDiskStorageAsync();
        const totalBytes = await FileSystem.getTotalDiskCapacityAsync();
        if (totalBytes > 0) snapshot.totalStorage = totalBytes;
        if (freeBytes >= 0) snapshot.freeStorage = freeBytes;
      } catch { /* expo-file-system may not be available */ }
    }

    // Platform-specific overrides
    if (Platform.OS === 'android') {
      snapshot.osName = 'Android';
    } else if (Platform.OS === 'ios') {
      snapshot.osName = 'iOS';
    } else if (Platform.OS === 'web') {
      snapshot.osName = 'Web';
      if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) snapshot.deviceBrand = 'Chrome';
        else if (ua.includes('Firefox')) snapshot.deviceBrand = 'Firefox';
        else if (ua.includes('Safari')) snapshot.deviceBrand = 'Safari';
        else if (ua.includes('Edge')) snapshot.deviceBrand = 'Edge';

        if (ua.includes('Windows')) snapshot.osName = 'Windows';
        else if (ua.includes('Mac')) snapshot.osName = 'macOS';
        else if (ua.includes('Linux')) snapshot.osName = 'Linux';
        else if (ua.includes('Android')) snapshot.osName = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) snapshot.osName = 'iOS';
      }
    }
  } catch { /* non-critical */ }

  return snapshot;
}

export function getDeviceIdentifier(): string {
  try {
    const parts: string[] = [];
    if (Device.brand) parts.push(Device.brand);
    if (Device.modelName) parts.push(Device.modelName);
    if (Device.osName) parts.push(Device.osName);
    if (Device.osVersion) parts.push(Device.osVersion);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
  } catch {
    return 'Unknown Device';
  }
}
