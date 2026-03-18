import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Calendar, X, Check } from 'lucide-react-native';
import CustomDatePicker from './CustomDatePicker';
import { isValidISODateString } from '@/utils/isValidDate';

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
  /** Use inside ScrollView (avoid flex:1 stretching) */
  compact?: boolean;
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
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return '';
  const iso = `${yyyy}-${mm}-${dd}`;
  return isValidISODateString(iso) ? iso : '';
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
  compact = false,
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
      if (iso && isValidISODateString(iso)) {
        let inRange = true;
        if (minimumDate) {
          const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
          const cur = new Date(iso + 'T12:00:00');
          if (cur < min) inRange = false;
        }
        if (maximumDate && inRange) {
          const max = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate());
          const cur = new Date(iso + 'T12:00:00');
          if (cur > max) inRange = false;
        }
        if (inRange) {
          setHasError(false);
          onChangeDate(iso);
          setPickerDate(new Date(iso + 'T12:00:00'));
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
  }, [onChangeDate, minimumDate, maximumDate]);

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
    <View style={[styles.container, compact && { flex: 0 }]} pointerEvents="box-none">
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.inputRow, hasError && styles.inputRowError]}
        pointerEvents="auto"
      >
        <TextInput
          style={[styles.textInput, Platform.OS === 'web' && styles.textInputWeb]}
          value={displayText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          inputMode="numeric"
          maxLength={10}
          editable
          selectTextOnFocus={Platform.OS !== 'web'}
          importantForAutofill="no"
        />
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={handlePickerOpen}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Open calendar"
        >
          <Calendar size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      {hasError && (
        <Text style={styles.errorText}>Enter a valid date (DD-MM-YYYY) within the allowed range</Text>
      )}

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.pickerModalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)} />
          <View style={styles.modalContent} pointerEvents="box-none">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select date (DD-MM-YYYY)</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} activeOpacity={0.7} hitSlop={12}>
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
        </View>
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
    minWidth: 96,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    letterSpacing: 0.5,
  },
  textInputWeb: {
    outlineStyle: 'none' as any,
    minHeight: 40,
  },
  pickerModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalContent: {
    width: '90%',
    maxWidth: 380,
    zIndex: 20,
    elevation: 30,
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
