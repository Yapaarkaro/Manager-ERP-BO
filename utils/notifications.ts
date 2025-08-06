import Toast from 'react-native-toast-message';

// Manager's brand colors
const Colors = {
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  title?: string;
  message: string;
  duration?: number;
}

/**
 * Show a notification toast
 * @param type - The type of notification (success, error, info)
 * @param options - Notification options
 */
export const showNotification = (
  type: NotificationType,
  options: NotificationOptions
) => {
  const { title, message, duration = 3000 } = options;

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          type: 'success',
          text1: title || 'Success',
          text2: message,
          position: 'top' as const,
          visibilityTime: duration,
          autoHide: true,
          topOffset: 50,
          props: {
            style: {
              backgroundColor: Colors.success,
              borderLeftColor: Colors.success,
            },
            text1Style: {
              color: Colors.background,
              fontSize: 16,
              fontWeight: '600',
            },
            text2Style: {
              color: Colors.background,
              fontSize: 14,
              fontWeight: '400',
            },
          },
        };
      case 'error':
        return {
          type: 'error',
          text1: title || 'Error',
          text2: message,
          position: 'top' as const,
          visibilityTime: duration,
          autoHide: true,
          topOffset: 50,
          props: {
            style: {
              backgroundColor: Colors.error,
              borderLeftColor: Colors.error,
            },
            text1Style: {
              color: Colors.background,
              fontSize: 16,
              fontWeight: '600',
            },
            text2Style: {
              color: Colors.background,
              fontSize: 14,
              fontWeight: '400',
            },
          },
        };
      case 'info':
        return {
          type: 'info',
          text1: title || 'Info',
          text2: message,
          position: 'top' as const,
          visibilityTime: duration,
          autoHide: true,
          topOffset: 50,
          props: {
            style: {
              backgroundColor: Colors.warning,
              borderLeftColor: Colors.warning,
            },
            text1Style: {
              color: Colors.background,
              fontSize: 16,
              fontWeight: '600',
            },
            text2Style: {
              color: Colors.background,
              fontSize: 14,
              fontWeight: '400',
            },
          },
        };
      default:
        return {
          type: 'info',
          text1: title || 'Info',
          text2: message,
          position: 'top' as const,
          visibilityTime: duration,
          autoHide: true,
          topOffset: 50,
        };
    }
  };

  Toast.show(getConfig());
};

/**
 * Show a success notification
 */
export const showSuccess = (message: string, title?: string) => {
  showNotification('success', { message, title });
};

/**
 * Show an error notification
 */
export const showError = (message: string, title?: string) => {
  showNotification('error', { message, title });
};

/**
 * Show an info notification
 */
export const showInfo = (message: string, title?: string) => {
  showNotification('info', { message, title });
};

/**
 * Hide all toasts
 */
export const hideNotifications = () => {
  Toast.hide();
}; 