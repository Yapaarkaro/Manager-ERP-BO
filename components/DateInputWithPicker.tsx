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
import { Calendar, X, Check } from 'lucide-react-native';
import CustomDatePicker from './CustomDatePicker';

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

interface DateInputWithPickerProps {
  label: string;
  value: string; // stored as YYYY-MM-DD internally
  onChangeDate: (isoDate: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toDisplayFormat(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function toISOFormat(displayDate: string): string {
  if (!displayDate) return '';
  const parts = displayDate.split('-');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return '';
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return '';
  return `${yyyy}-${mm}-${dd}`;
}

function autoFormatDateInput(text: string): string {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
}

const DateInputWithPicker: React.FC<DateInputWithPickerProps> = ({
  label,
  value,
  onChangeDate,
  placeholder = 'DD-MM-YYYY',
  minimumDate,
  maximumDate = new Date(2030, 11, 31),
}) => {
  const [displayText, setDisplayText] = useState(toDisplayFormat(value));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );
  const [hasError, setHasError] = useState(false);

  const handleTextChange = useCallback((text: string) => {
    const formatted = autoFormatDateInput(text);
    setDisplayText(formatted);

    if (formatted.length === 10) {
      const iso = toISOFormat(formatted);
      if (iso) {
        const testDate = new Date(iso);
        if (!isNaN(testDate.getTime())) {
          setHasError(false);
          onChangeDate(iso);
          setPickerDate(testDate);
          return;
        }
      }
      setHasError(true);
    } else {
      setHasError(false);
      if (formatted.length === 0) {
        onChangeDate('');
      }
    }
  }, [onChangeDate]);

  const handlePickerOpen = useCallback(() => {
    if (value) {
      setPickerDate(new Date(value));
    }
    setShowPicker(true);
  }, [value]);

  const handlePickerChange = useCallback((date: Date) => {
    setPickerDate(date);
  }, []);

  const handlePickerConfirm = useCallback(() => {
    const yyyy = pickerDate.getFullYear();
    const mm = String(pickerDate.getMonth() + 1).padStart(2, '0');
    const dd = String(pickerDate.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    onChangeDate(iso);
    setDisplayText(`${dd}-${mm}-${yyyy}`);
    setHasError(false);
    setShowPicker(false);
  }, [pickerDate, onChangeDate]);

  React.useEffect(() => {
    setDisplayText(toDisplayFormat(value));
  }, [value]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <TextInput
          style={styles.textInput}
          value={displayText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
          maxLength={10}
        />
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={handlePickerOpen}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Calendar size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      {hasError && (
        <Text style={styles.errorText}>Invalid date format</Text>
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
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <CustomDatePicker
              value={pickerDate}
              onChange={handlePickerChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />

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
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  calendarButton: {
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

export default DateInputWithPicker;
