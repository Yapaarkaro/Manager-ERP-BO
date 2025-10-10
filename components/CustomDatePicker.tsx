import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  textColor?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minimumDate = new Date(1950, 0, 1),
  maximumDate = new Date(),
  textColor = '#3F66AC',
}) => {
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);
  
  const previousDayRef = useRef(selectedDay);
  const previousMonthRef = useRef(selectedMonth);
  const previousYearRef = useRef(selectedYear);

  // Generate arrays for days, months, and years
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from(
    { length: maximumDate.getFullYear() - minimumDate.getFullYear() + 1 },
    (_, i) => minimumDate.getFullYear() + i
  );

  // Get days in selected month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear);
  const validDays = days.slice(0, daysInSelectedMonth);

  // Adjust day if it exceeds days in selected month
  useEffect(() => {
    if (selectedDay > daysInSelectedMonth) {
      setSelectedDay(daysInSelectedMonth);
    }
  }, [selectedMonth, selectedYear]);

  // Emit change when any value changes
  useEffect(() => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onChange(newDate);
  }, [selectedDay, selectedMonth, selectedYear]);

  // Scroll to initial position on mount
  useEffect(() => {
    setTimeout(() => {
      scrollToIndex(dayScrollRef, validDays.indexOf(selectedDay));
      scrollToIndex(monthScrollRef, selectedMonth);
      scrollToIndex(yearScrollRef, years.indexOf(selectedYear));
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
    
    // Trigger haptic feedback only when value changes
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
          {/* Top padding */}
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
          
          {/* Bottom padding */}
          <View style={{ height: ITEM_HEIGHT * 2 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selection indicator */}
      <View style={styles.selectionIndicator} />
      
      <View style={styles.pickerContainer}>
        {/* Day Picker */}
        {renderPickerColumn(
          validDays,
          selectedDay,
          dayScrollRef,
          setSelectedDay,
          previousDayRef,
          (day) => day.toString().padStart(2, '0')
        )}

        {/* Month Picker */}
        {renderPickerColumn(
          months.map((_, i) => i),
          selectedMonth,
          monthScrollRef,
          setSelectedMonth,
          previousMonthRef,
          (monthIndex) => months[monthIndex].substring(0, 3)
        )}

        {/* Year Picker */}
        {renderPickerColumn(
          years,
          selectedYear,
          yearScrollRef,
          setSelectedYear,
          previousYearRef
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
  selectedItem: {
    // Additional styling for selected item if needed
  },
  pickerItemText: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default CustomDatePicker;

