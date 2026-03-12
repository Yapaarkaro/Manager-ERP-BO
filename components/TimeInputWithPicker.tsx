import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Clock, X, Check } from 'lucide-react-native';
import CustomTimePicker from './CustomTimePicker';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  error: '#DC2626',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  },
};

interface TimeInputWithPickerProps {
  label: string;
  value: string; // HH:mm format (24-hour)
  onChangeTime: (time: string) => void;
  placeholder?: string;
  use24Hour?: boolean;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };
  const parts = timeStr.split(':');
  if (parts.length < 2) return { hours: 9, minutes: 0 };
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return {
    hours: isNaN(h) ? 9 : Math.max(0, Math.min(23, h)),
    minutes: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const { hours, minutes } = parseTime(timeStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function autoFormatTimeInput(text: string): string {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

const TimeInputWithPicker: React.FC<TimeInputWithPickerProps> = ({
  label,
  value,
  onChangeTime,
  placeholder = 'HH:MM',
  use24Hour = false,
  minuteInterval = 1,
}) => {
  const [displayText, setDisplayText] = useState(formatTimeDisplay(value));
  const [showPicker, setShowPicker] = useState(false);
  const { hours: initH, minutes: initM } = parseTime(value);
  const [pickerHours, setPickerHours] = useState(initH);
  const [pickerMinutes, setPickerMinutes] = useState(initM);
  const [hasError, setHasError] = useState(false);

  const handleTextChange = useCallback((text: string) => {
    const formatted = autoFormatTimeInput(text);
    setDisplayText(formatted);

    if (formatted.length === 5) {
      const [hStr, mStr] = formatted.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setHasError(false);
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        onChangeTime(timeStr);
        setPickerHours(h);
        setPickerMinutes(m);
        return;
      }
      setHasError(true);
    } else {
      setHasError(false);
      if (formatted.length === 0) {
        onChangeTime('');
      }
    }
  }, [onChangeTime]);

  const handlePickerOpen = useCallback(() => {
    if (value) {
      const { hours, minutes } = parseTime(value);
      setPickerHours(hours);
      setPickerMinutes(minutes);
    }
    setShowPicker(true);
  }, [value]);

  const handlePickerChange = useCallback((hours: number, minutes: number) => {
    setPickerHours(hours);
    setPickerMinutes(minutes);
  }, []);

  const handlePickerConfirm = useCallback(() => {
    const timeStr = `${pickerHours.toString().padStart(2, '0')}:${pickerMinutes.toString().padStart(2, '0')}`;
    onChangeTime(timeStr);
    setDisplayText(formatTimeDisplay(timeStr));
    setHasError(false);
    setShowPicker(false);
  }, [pickerHours, pickerMinutes, onChangeTime]);

  React.useEffect(() => {
    setDisplayText(formatTimeDisplay(value));
  }, [value]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputRow, hasError && styles.inputRowError]}
        onPress={handlePickerOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.displayText, !displayText && styles.placeholderText]}>
          {displayText || placeholder}
        </Text>
        <View style={styles.clockButton}>
          <Clock size={20} color={Colors.primary} />
        </View>
      </TouchableOpacity>
      {hasError && (
        <Text style={styles.errorText}>Invalid time format</Text>
      )}

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <CustomTimePicker
              hours={pickerHours}
              minutes={pickerMinutes}
              onChange={handlePickerChange}
              use24Hour={use24Hour}
              minuteInterval={minuteInterval}
            />

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Selected:</Text>
              <Text style={styles.previewValue}>
                {formatTimeDisplay(`${pickerHours.toString().padStart(2, '0')}:${pickerMinutes.toString().padStart(2, '0')}`)}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPicker(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handlePickerConfirm}
                activeOpacity={0.8}
              >
                <Check size={18} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  displayText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  placeholderText: {
    color: Colors.textLight,
    fontWeight: '400',
  },
  clockButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TimeInputWithPicker;
