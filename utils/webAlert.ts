/**
 * Web-compatible Alert utility
 * Uses custom modal component that works on both web and native
 */

import { Platform, Alert } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// Global state for custom alert
let alertState: {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  type: 'default' | 'success' | 'error' | 'warning' | 'info';
  resolve: (value: string) => void;
} | null = null;

let alertListeners: Array<(state: typeof alertState) => void> = [];

export function subscribeToAlert(listener: (state: typeof alertState) => void) {
  alertListeners.push(listener);
  return () => {
    alertListeners = alertListeners.filter(l => l !== listener);
  };
}

export function getAlertState() {
  return alertState;
}

export function setAlertState(state: typeof alertState) {
  alertState = state;
  alertListeners.forEach(listener => listener(state));
}

/**
 * Show an alert that works on both web and native
 */
export function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean },
  type: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default'
): Promise<string> {
  return new Promise((resolve) => {
    const defaultButtons: AlertButton[] = buttons || [{ text: 'OK' }];
    
    if (Platform.OS === 'web') {
      // Use custom modal on web
      setAlertState({
        visible: true,
        title,
        message,
        buttons: defaultButtons.map(btn => ({
          ...btn,
          onPress: () => {
            btn.onPress?.();
            resolve(btn.text);
            setAlertState(null);
          },
        })),
        type,
        resolve,
      });
    } else {
      // On native, use React Native Alert
      Alert.alert(title, message, defaultButtons, options);
      resolve(defaultButtons[0]?.text || 'OK');
    }
  });
}

/**
 * Show a confirmation dialog
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  onCancel?: () => void,
  type: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default'
): void {
  if (Platform.OS === 'web') {
    // Use custom modal on web
    setAlertState({
      visible: true,
      title,
      message,
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            onCancel?.();
            setAlertState(null);
          },
        },
        {
          text: 'OK',
          onPress: async () => {
            const result = onConfirm();
            if (result instanceof Promise) {
              await result;
            }
            setAlertState(null);
          },
        },
      ],
      type,
      resolve: () => {},
    });
  } else {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'OK',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  }
}

