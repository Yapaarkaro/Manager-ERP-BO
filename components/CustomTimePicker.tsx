import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface CustomTimePickerProps {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  use24Hour?: boolean;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  textColor?: string;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  hours: initialHours,
  minutes: initialMinutes,
  onChange,
  use24Hour = true,
  minuteInterval = 1,
  textColor = '#3F66AC',
}) => {
  const is12Hour = !use24Hour;

  const toDisplay = (h: number) => {
    if (!is12Hour) return h;
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const [selectedHour, setSelectedHour] = useState(initialHours);
  const [selectedMinute, setSelectedMinute] = useState(initialMinutes);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialHours >= 12 ? 'PM' : 'AM');

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const periodScrollRef = useRef<ScrollView>(null);

  const previousHourRef = useRef(selectedHour);
  const previousMinuteRef = useRef(selectedMinute);
  const previousPeriodRef = useRef(selectedPeriod === 'AM' ? 0 : 1);

  const hourItems = use24Hour
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i + 1);

  const minuteItems = Array.from(
    { length: Math.floor(60 / minuteInterval) },
    (_, i) => i * minuteInterval
  );

  const periodItems = [0, 1]; // 0 = AM, 1 = PM

  useEffect(() => {
    let h24 = selectedHour;
    if (is12Hour) {
      if (selectedPeriod === 'AM') {
        h24 = selectedHour === 12 ? 0 : selectedHour;
      } else {
        h24 = selectedHour === 12 ? 12 : selectedHour + 12;
      }
    }
    onChange(h24, selectedMinute);
  }, [selectedHour, selectedMinute, selectedPeriod]);

  useEffect(() => {
    setTimeout(() => {
      const hourIdx = hourItems.indexOf(is12Hour ? toDisplay(initialHours) : initialHours);
      scrollToIndex(hourScrollRef, hourIdx >= 0 ? hourIdx : 0);

      const closestMin = minuteItems.reduce((prev, curr) =>
        Math.abs(curr - initialMinutes) < Math.abs(prev - initialMinutes) ? curr : prev
      );
      scrollToIndex(minuteScrollRef, minuteItems.indexOf(closestMin));

      if (is12Hour) {
        scrollToIndex(periodScrollRef, initialHours >= 12 ? 1 : 0);
      }
    }, 100);
  }, []);

  const scrollToIndex = (scrollRef: React.RefObject<ScrollView>, index: number) => {
    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleScroll = (
    event: any,
    items: any[],
    setValue: (value: number) => void,
    previousValueRef: React.MutableRefObject<number>
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    const newValue = items[clampedIndex];

    if (newValue !== previousValueRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      previousValueRef.current = newValue;
    }

    setValue(newValue);
  };

  const renderPickerColumn = (
    items: any[],
    selectedValue: any,
    scrollRef: React.RefObject<ScrollView>,
    setValue: (value: number) => void,
    previousValueRef: React.MutableRefObject<number>,
    format?: (item: any) => string
  ) => {
    return (
      <View style={styles.pickerColumn}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => handleScroll(e, items, setValue, previousValueRef)}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={{ height: ITEM_HEIGHT * 2 }} />

          {items.map((item, index) => {
            const isSelected = item === selectedValue;
            const displayValue = format ? format(item) : item.toString();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  isSelected && styles.selectedItem,
                ]}
                onPress={() => {
                  setValue(item);
                  scrollToIndex(scrollRef, index);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    isSelected && { color: textColor, fontWeight: '700', fontSize: 20 },
                    !isSelected && { color: '#999999', fontSize: 16 },
                  ]}
                >
                  {displayValue}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: ITEM_HEIGHT * 2 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectionIndicator} />

      <View style={styles.pickerContainer}>
        {/* Hour Picker */}
        {renderPickerColumn(
          hourItems,
          is12Hour ? toDisplay(selectedHour) : selectedHour,
          hourScrollRef,
          (val) => {
            if (is12Hour) {
              setSelectedHour(val);
            } else {
              setSelectedHour(val);
            }
          },
          previousHourRef,
          (h) => h.toString().padStart(2, '0')
        )}

        {/* Separator */}
        <View style={styles.separatorColumn}>
          <Text style={[styles.separatorText, { color: textColor }]}>:</Text>
        </View>

        {/* Minute Picker */}
        {renderPickerColumn(
          minuteItems,
          selectedMinute,
          minuteScrollRef,
          setSelectedMinute,
          previousMinuteRef,
          (m) => m.toString().padStart(2, '0')
        )}

        {/* AM/PM Picker (12-hour mode only) */}
        {is12Hour && renderPickerColumn(
          periodItems,
          selectedPeriod === 'AM' ? 0 : 1,
          periodScrollRef,
          (val) => setSelectedPeriod(val === 0 ? 'AM' : 'PM'),
          previousPeriodRef,
          (val) => val === 0 ? 'AM' : 'PM'
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#3F66AC20',
    backgroundColor: '#F5C75410',
    zIndex: 1,
    pointerEvents: 'none',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
    alignItems: 'center',
  },
  pickerColumn: {
    flex: 1,
    height: PICKER_HEIGHT,
  },
  scrollContent: {
    paddingVertical: 0,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItem: {},
  pickerItemText: {
    fontSize: 18,
    textAlign: 'center',
  },
  separatorColumn: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
  },
  separatorText: {
    fontSize: 24,
    fontWeight: '700',
  },
});

export default CustomTimePicker;
