import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Pressable } from 'react-native';
import { Calendar, X } from 'lucide-react-native';
import DateInputWithPicker from './DateInputWithPicker';
import { formatDateDDMMYYYY } from '@/utils/formatters';

export type TimeRange = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DateFilterBarProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  customFromDate: string;
  customToDate: string;
  onCustomFromChange: (date: string) => void;
  onCustomToChange: (date: string) => void;
}

const Colors = {
  primary: '#3f66ac',
  text: '#1F2937',
  textLight: '#6B7280',
  background: '#FFFFFF',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB' },
};

const CHIPS: { key: TimeRange; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

export function getLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string | Date | undefined,
  range: TimeRange,
  customFrom?: string,
  customTo?: string,
): T[] {
  if (range === 'all') return items;
  if (range === 'custom' && (!customFrom || !customTo)) return items;

  const now = new Date();
  const todayStr = getLocalDateStr(now);

  return items.filter(item => {
    const dateVal = getDate(item);
    if (!dateVal) return true;
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return true;
    const itemDateStr = getLocalDateStr(d);

    switch (range) {
      case 'today':
        return itemDateStr === todayStr;
      case 'week': {
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return itemDateStr >= getLocalDateStr(weekAgo) && itemDateStr <= todayStr;
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return itemDateStr >= getLocalDateStr(monthStart) && itemDateStr <= todayStr;
      }
      case 'custom':
        return itemDateStr >= customFrom! && itemDateStr <= customTo!;
      default:
        return true;
    }
  });
}

export function getTimeRangeLabel(
  range: TimeRange,
  customFrom?: string,
  customTo?: string,
): string {
  switch (range) {
    case 'all': return 'All time';
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'custom':
      if (customFrom && customTo) {
        return `${formatDateDDMMYYYY(customFrom)} – ${formatDateDDMMYYYY(customTo)}`;
      }
      return 'Custom Range';
    default: return '';
  }
}

const DateFilterBar: React.FC<DateFilterBarProps> = ({
  selectedRange,
  onRangeChange,
  customFromDate,
  customToDate,
  onCustomFromChange,
  onCustomToChange,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleChipPress = (range: TimeRange) => {
    if (range === 'custom') {
      setShowCustomModal(true);
    } else {
      onRangeChange(range);
    }
  };

  const handleApplyCustom = () => {
    if (customFromDate && customToDate) {
      onRangeChange('custom');
      setShowCustomModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipsRow}>
        {CHIPS.map(chip => {
          const isActive = selectedRange === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleChipPress(chip.key)}
              activeOpacity={0.7}
            >
              {chip.key === 'custom' && <Calendar size={13} color={isActive ? '#fff' : Colors.textLight} />}
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.key === 'custom' && selectedRange === 'custom' && customFromDate && customToDate
                  ? getTimeRangeLabel('custom', customFromDate, customToDate)
                  : chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showCustomModal} transparent animationType="fade" onRequestClose={() => setShowCustomModal(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowCustomModal(false)}
            accessibilityLabel="Close date picker"
          />
          <View style={styles.modalContent} pointerEvents="box-none">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Type DD-MM-YYYY or tap the calendar icon</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DateInputWithPicker
                  label="From date"
                  value={customFromDate}
                  onChangeDate={onCustomFromChange}
                  placeholder="DD-MM-YYYY"
                  compact
                />
              </View>
              <View style={styles.dateField}>
                <DateInputWithPicker
                  label="To date"
                  value={customToDate}
                  onChangeDate={onCustomToChange}
                  placeholder="DD-MM-YYYY"
                  compact
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.applyButton, (!customFromDate || !customToDate) && styles.applyButtonDisabled]}
              onPress={handleApplyCustom}
              disabled={!customFromDate || !customToDate}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>Apply Range</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '92%',
    maxWidth: 440,
    zIndex: 10,
    elevation: 24,
  },
  modalHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
    marginTop: -8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DateFilterBar;
