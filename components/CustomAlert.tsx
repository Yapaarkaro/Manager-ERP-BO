/**
 * Custom Alert Modal Component
 * Matches app's brand design and works on both web and native
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { AlertTriangle, CheckCircle, X, Info } from 'lucide-react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  grey: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

export default function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  type = 'default',
  onClose,
}: CustomAlertProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} color={Colors.success} />;
      case 'error':
        return <AlertTriangle size={48} color={Colors.error} />;
      case 'warning':
        return <AlertTriangle size={48} color={Colors.warning} />;
      case 'info':
        return <Info size={48} color={Colors.info} />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.warning;
      case 'info':
        return Colors.info;
      default:
        return Colors.primary;
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={Colors.textLight} />
            </TouchableOpacity>

            {getIcon() && (
              <View style={styles.iconContainer}>
                <View style={[styles.iconWrapper, { borderColor: getTypeColor() }]}>
                  {getIcon()}
                </View>
              </View>
            )}

            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isCancel && styles.cancelButton,
                        isDestructive && [styles.destructiveButton, { backgroundColor: Colors.error }],
                        !isCancel && !isDestructive && [styles.primaryButton, { backgroundColor: getTypeColor() }],
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.cancelButtonText,
                          isDestructive && styles.destructiveButtonText,
                          !isCancel && !isDestructive && styles.primaryButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: Colors.background,
  },
  cancelButtonText: {
    color: Colors.text,
  },
  destructiveButtonText: {
    color: Colors.background,
  },
});

















