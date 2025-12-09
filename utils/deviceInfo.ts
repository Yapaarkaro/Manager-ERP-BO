/**
 * Device Information Collection Utility
 * Collects comprehensive device information using expo-device and other APIs
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface DeviceSnapshot {
  // Device Information
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceType?: string;
  deviceYearClass?: number;
  osName?: string;
  osVersion?: string;
  platformApiLevel?: number;
  
  // Network Information
  networkServiceProvider?: string;
  internetServiceProvider?: string;
  wifiName?: string;
  bluetoothName?: string;
  
  // Additional Device Details
  deviceId?: string;
  manufacturer?: string;
  totalMemory?: number;
  isDevice?: boolean;
  isEmulator?: boolean;
  isTablet?: boolean;
  
  // App Information
  appVersion?: string;
  appBuildNumber?: string;
}

/**
 * Collect comprehensive device information
 */
export async function collectDeviceSnapshot(): Promise<DeviceSnapshot> {
  const snapshot: DeviceSnapshot = {};

  try {
    // Basic Device Information
    if (Device.deviceName) {
      snapshot.deviceName = Device.deviceName;
    }
    
    if (Device.brand) {
      snapshot.deviceBrand = Device.brand;
    }
    
    if (Device.modelName) {
      snapshot.deviceModel = Device.modelName;
    }
    
    if (Device.deviceType !== undefined && Device.deviceType !== null) {
      snapshot.deviceType = String(Device.deviceType);
    }
    
    if (Device.deviceYearClass) {
      snapshot.deviceYearClass = Device.deviceYearClass;
    }
    
    if (Device.osName) {
      snapshot.osName = Device.osName;
    }
    
    if (Device.osVersion) {
      snapshot.osVersion = Device.osVersion;
    }
    
    if (Device.platformApiLevel) {
      snapshot.platformApiLevel = Device.platformApiLevel;
    }
    
    // Device Capabilities
    snapshot.isDevice = Device.isDevice ?? false;
    snapshot.isEmulator = !Device.isDevice;
    
    if (Device.deviceType !== undefined && Device.DeviceType) {
      snapshot.isTablet = Device.deviceType === Device.DeviceType.TABLET;
    }
    
    // Manufacturer (if available)
    if (Device.manufacturer) {
      snapshot.manufacturer = Device.manufacturer;
    }
    
    // Device ID (using installation ID from Constants, with fallback for web)
    if (Constants.installationId) {
      snapshot.deviceId = Constants.installationId;
    } else if (Platform.OS === 'web') {
      // Generate a persistent device ID for web using localStorage
      try {
        const storageKey = 'expo_device_id';
        let deviceId = null;
        if (typeof window !== 'undefined' && window.localStorage) {
          deviceId = window.localStorage.getItem(storageKey);
          if (!deviceId) {
            // Generate a unique ID
            deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window.localStorage.setItem(storageKey, deviceId);
          }
          snapshot.deviceId = deviceId;
        }
      } catch (error) {
        console.warn('⚠️ Could not generate device ID for web:', error);
      }
    }
    
    // App Information
    if (Constants.expoConfig?.version) {
      snapshot.appVersion = Constants.expoConfig.version;
    }
    
    if (Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode) {
      snapshot.appBuildNumber = Platform.OS === 'ios' 
        ? Constants.expoConfig?.ios?.buildNumber?.toString()
        : Constants.expoConfig?.android?.versionCode?.toString();
    }
    
    // Network Information (Platform-specific)
    if (Platform.OS === 'web') {
      // Web-specific information
      snapshot.internetServiceProvider = 'Web Browser';
      
      // Try to get connection info if available
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          snapshot.internetServiceProvider = connection.effectiveType || 'Unknown';
        }
      }
    } else {
      // Mobile-specific information
      // Note: Network service provider and WiFi name require additional permissions
      // These may not be available on all platforms
      snapshot.networkServiceProvider = 'Mobile Network';
      
      // WiFi and Bluetooth names typically require additional native modules
      // For now, we'll leave these as optional and can be enhanced later
    }
    
    // Additional platform-specific information
    if (Platform.OS === 'android') {
      // Android-specific info
      snapshot.osName = 'Android';
    } else if (Platform.OS === 'ios') {
      // iOS-specific info
      snapshot.osName = 'iOS';
    } else if (Platform.OS === 'web') {
      // Web-specific info
      snapshot.osName = 'Web';
      
      // Try to detect browser and OS from user agent
      if (typeof navigator !== 'undefined') {
        const userAgent = navigator.userAgent;
        
        // Detect browser
        if (userAgent.includes('Chrome')) {
          snapshot.deviceBrand = 'Chrome';
        } else if (userAgent.includes('Firefox')) {
          snapshot.deviceBrand = 'Firefox';
        } else if (userAgent.includes('Safari')) {
          snapshot.deviceBrand = 'Safari';
        } else if (userAgent.includes('Edge')) {
          snapshot.deviceBrand = 'Edge';
        }
        
        // Detect OS from user agent
        if (userAgent.includes('Windows')) {
          snapshot.osName = 'Windows';
        } else if (userAgent.includes('Mac')) {
          snapshot.osName = 'macOS';
        } else if (userAgent.includes('Linux')) {
          snapshot.osName = 'Linux';
        } else if (userAgent.includes('Android')) {
          snapshot.osName = 'Android';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
          snapshot.osName = 'iOS';
        }
      }
    }
    
    console.log('✅ Device snapshot collected:', snapshot);
    
  } catch (error) {
    console.error('❌ Error collecting device snapshot:', error);
  }
  
  return snapshot;
}

/**
 * Get a simplified device identifier for logging
 */
export function getDeviceIdentifier(): string {
  try {
    const parts: string[] = [];
    
    if (Device.brand) parts.push(Device.brand);
    if (Device.modelName) parts.push(Device.modelName);
    if (Device.osName) parts.push(Device.osName);
    if (Device.osVersion) parts.push(Device.osVersion);
    
    return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
  } catch (error) {
    console.error('Error getting device identifier:', error);
    return 'Unknown Device';
  }
}

