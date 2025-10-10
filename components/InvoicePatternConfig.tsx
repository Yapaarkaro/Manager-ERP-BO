import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar, Hash, Type, ChevronUp, ChevronDown } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface InvoicePatternConfigProps {
  onPatternChange: (pattern: string) => void;
  onPrefixChange: (prefix: string) => void;
  onStartingNumberChange: (number: string) => void;
  initialPattern?: string;
  initialPrefix?: string;
  initialStartingNumber?: string;
}

interface PatternItem {
  id: string;
  type: 'prefix' | 'year' | 'month' | 'number';
  label: string;
  value: string;
  icon: React.ReactNode;
  format?: string; // Format option for the component
}

interface FormatOption {
  value: string;
  label: string;
  preview: string;
}

const InvoicePatternConfig: React.FC<InvoicePatternConfigProps> = ({
  onPatternChange,
  onPrefixChange,
  onStartingNumberChange,
  initialPattern = '',
  initialPrefix = 'INV',
  initialStartingNumber = '1',
}) => {
  const [prefix, setPrefix] = useState(initialPrefix);
  const [startingNumber, setStartingNumber] = useState(initialStartingNumber);
  const [selectedItems, setSelectedItems] = useState<PatternItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Initialize with Prefix and Number on mount
  React.useEffect(() => {
    if (selectedItems.length === 0) {
      const initialItems = [
        {
          id: 'prefix',
          type: 'prefix' as const,
          label: 'Prefix',
          value: prefix,
          icon: <Type size={16} color="#3F66AC" />,
        },
        {
          id: 'number',
          type: 'number' as const,
          label: 'Number',
          value: startingNumber,
          icon: <Hash size={16} color="#3F66AC" />,
          format: 'padded',
        },
      ];
      setSelectedItems(initialItems);
      generatePattern(initialItems);
    }
  }, []);

  // Format options for different components
  const yearFormats: FormatOption[] = [
    { value: 'full', label: 'Full Year', preview: '2025' },
    { value: 'fiscal', label: 'Fiscal Year', preview: '2025-26' },
  ];

  const monthFormats: FormatOption[] = [
    { value: 'numeric', label: 'Numeric', preview: '10' },
    { value: 'short', label: 'Short Name', preview: 'Oct' },
    { value: 'full', label: 'Full Name', preview: 'October' },
  ];

  const numberFormats: FormatOption[] = [
    { value: 'plain', label: 'Plain', preview: '46' },
    { value: 'padded', label: 'Zero Padded', preview: '0046' },
  ];

  const availableItems: PatternItem[] = [
    {
      id: 'year',
      type: 'year',
      label: 'Year',
      value: new Date().getFullYear().toString(),
      icon: <Calendar size={16} color="#3F66AC" />,
      format: 'full',
    },
    {
      id: 'month',
      type: 'month',
      label: 'Month',
      value: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      icon: <Calendar size={16} color="#3F66AC" />,
      format: 'numeric',
    },
  ];

  const prefixItem: PatternItem = {
    id: 'prefix',
    type: 'prefix',
    label: 'Prefix',
    value: prefix,
    icon: <Type size={16} color="#3F66AC" />,
  };

  const numberItem: PatternItem = {
    id: 'number',
    type: 'number',
    label: 'Number',
    value: startingNumber,
    icon: <Hash size={16} color="#3F66AC" />,
    format: 'padded',
  };

  const handleAddItem = (item: PatternItem) => {
    // Check if item already exists (except for prefix and number which can be duplicated)
    if (item.type === 'year' || item.type === 'month') {
      const exists = selectedItems.some(selected => selected.type === item.type);
      if (exists) {
        Alert.alert('Already Added', `${item.label} is already in the pattern`);
        return;
      }
    }

    const newItems = [...selectedItems, { ...item }];
    setSelectedItems(newItems);
    generatePattern(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
    generatePattern(newItems);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...selectedItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setSelectedItems(newItems);
    generatePattern(newItems);
  };

  const generatePattern = (items: PatternItem[]) => {
    const pattern = items.map(item => {
      switch (item.type) {
        case 'prefix':
          return item.value;
        case 'year':
          return item.format === 'fiscal' ? 'YYYY-YY' : 'YYYY';
        case 'month':
          return item.format === 'short' ? 'MMM' : 
                 item.format === 'full' ? 'MMMM' : 'MM';
        case 'number':
          return item.format === 'plain' ? '####' : '####';
        default:
          return item.value;
      }
    }).join('-');
    
    onPatternChange(pattern);
  };

  const handleFormatChange = (item: PatternItem, newFormat: string) => {
    const updatedItems = selectedItems.map(selectedItem => 
      selectedItem.id === item.id ? { ...selectedItem, format: newFormat } : selectedItem
    );
    setSelectedItems(updatedItems);
    generatePattern(updatedItems);
  };

  const toggleDropdown = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const getFormatOptions = (item: PatternItem): FormatOption[] => {
    switch (item.type) {
      case 'year':
        return yearFormats;
      case 'month':
        return monthFormats;
      case 'number':
        return numberFormats;
      default:
        return [];
    }
  };

  const handlePrefixChange = (text: string) => {
    setPrefix(text);
    onPrefixChange(text);
    // Update prefix in selected items
    const updatedItems = selectedItems.map(item => 
      item.type === 'prefix' ? { ...item, value: text } : item
    );
    setSelectedItems(updatedItems);
    generatePattern(updatedItems);
  };

  const handleStartingNumberChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setStartingNumber(cleaned);
    onStartingNumberChange(cleaned);
    // Update number in selected items
    const updatedItems = selectedItems.map(item => 
      item.type === 'number' ? { ...item, value: cleaned } : item
    );
    setSelectedItems(updatedItems);
    generatePattern(updatedItems);
  };

  const formatYear = (format: string) => {
    const currentYear = new Date().getFullYear();
    if (format === 'fiscal') {
      const nextYear = currentYear + 1;
      return `${currentYear}-${nextYear.toString().slice(-2)}`;
    }
    return currentYear.toString();
  };

  const formatMonth = (format: string) => {
    const currentMonth = new Date().getMonth();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const shortNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    switch (format) {
      case 'numeric':
        return (currentMonth + 1).toString().padStart(2, '0');
      case 'short':
        return shortNames[currentMonth];
      case 'full':
        return monthNames[currentMonth];
      default:
        return (currentMonth + 1).toString().padStart(2, '0');
    }
  };

  const formatNumber = (format: string) => {
    switch (format) {
      case 'plain':
        return startingNumber;
      case 'padded':
        return startingNumber.padStart(4, '0');
      default:
        return startingNumber.padStart(4, '0');
    }
  };

  const getPreviewPattern = () => {
    // If no items selected, show default pattern with prefix and number
    if (selectedItems.length === 0) {
      return `${prefix}-${startingNumber.padStart(4, '0')}`;
    }
    
    const parts = selectedItems.map(item => {
      switch (item.type) {
        case 'prefix':
          return item.value;
        case 'year':
          return formatYear(item.format || 'full');
        case 'month':
          return formatMonth(item.format || 'numeric');
        case 'number':
          return formatNumber(item.format || 'padded');
        default:
          return item.value;
      }
    });
    
    // Join with hyphen separator
    return parts.join('-');
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...selectedItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setSelectedItems(newItems);
    generatePattern(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === selectedItems.length - 1) return;
    const newItems = [...selectedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setSelectedItems(newItems);
    generatePattern(newItems);
  };

  const renderItem = (item: PatternItem, index: number) => {
    const getPatternDisplay = (item: PatternItem) => {
      switch (item.type) {
        case 'prefix':
          return item.value;
        case 'year':
          return item.format === 'fiscal' ? 'YYYY-YY' : 'YYYY';
        case 'month':
          return item.format === 'short' ? 'MMM' : 
                 item.format === 'full' ? 'MMMM' : 'MM';
        case 'number':
          return '####';
        default:
          return item.value;
      }
    };

    const getFormatLabel = (item: PatternItem) => {
      if (item.type === 'year') {
        return yearFormats.find(f => f.value === item.format)?.label || 'Full Year';
      } else if (item.type === 'month') {
        return monthFormats.find(f => f.value === item.format)?.label || 'Numeric';
      } else if (item.type === 'number') {
        return numberFormats.find(f => f.value === item.format)?.label || 'Zero Padded';
      }
      return '';
    };

    const isExpanded = expandedItemId === item.id;
    const canEdit = item.type === 'year' || item.type === 'month' || item.type === 'number';

    return (
      <View style={styles.selectedItem}>
        {/* Tap to edit hint */}
        {canEdit && (
          <Text style={styles.tapHint}>Tap to edit format</Text>
        )}
        
        <TouchableOpacity 
          style={styles.selectedItemRow}
          onPress={() => {
            if (canEdit) {
              toggleDropdown(item.id);
            }
          }}
          activeOpacity={canEdit ? 0.7 : 1}
        >
          <View style={styles.selectedItemContent}>
            <View style={styles.itemTitleRow}>
              {item.icon}
              <Text style={styles.selectedItemLabel}>{item.label}</Text>
              {canEdit && (
                <View style={styles.formatBadgeInline}>
                  <Text style={styles.formatBadgeText}>
                    {getFormatLabel(item)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.rightActions}>
            {/* Remove button for optional items */}
            {(item.type === 'year' || item.type === 'month') && (
              <TouchableOpacity
                style={styles.removeButtonSmall}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveItem(index);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.removeButtonTextSmall}>✕</Text>
              </TouchableOpacity>
            )}

            {/* Move Up/Down Buttons */}
            <View style={styles.reorderButtons}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  moveItemUp(index);
                }}
                disabled={index === 0}
                style={[
                  styles.reorderButton,
                  index === 0 && styles.reorderButtonDisabled,
                ]}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <ChevronUp 
                  size={16} 
                  color="#1a1a1a"
                  strokeWidth={3}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  moveItemDown(index);
                }}
                disabled={index === selectedItems.length - 1}
                style={[
                  styles.reorderButton,
                  index === selectedItems.length - 1 && styles.reorderButtonDisabled,
                ]}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <ChevronDown 
                  size={16} 
                  color="#1a1a1a"
                  strokeWidth={3}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Format Dropdown */}
        {isExpanded && canEdit && (
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Format:</Text>
            {getFormatOptions(item).map((format) => (
              <TouchableOpacity
                key={format.value}
                style={[
                  styles.dropdownOption,
                  item.format === format.value && styles.selectedDropdownOption
                ]}
                onPress={() => {
                  handleFormatChange(item, format.value);
                  setExpandedItemId(null);
                }}
              >
                <View style={styles.dropdownOptionContent}>
                  <Text style={[
                    styles.dropdownOptionLabel,
                    item.format === format.value && styles.selectedDropdownText
                  ]}>
                    {format.label}
                  </Text>
                  <Text style={[
                    styles.dropdownOptionPreview,
                    item.format === format.value && styles.selectedDropdownText
                  ]}>
                    {format.preview}
                  </Text>
                </View>
                {item.format === format.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Invoice Prefix */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Invoice Prefix *</Text>
        <View style={styles.inputContainer}>
          <Type size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={prefix}
            onChangeText={handlePrefixChange}
            placeholder="INV"
            placeholderTextColor="#999999"
            maxLength={10}
          />
        </View>
        <Text style={styles.hint}>Enter a prefix for your invoices (e.g., INV, BILL, RECEIPT)</Text>
      </View>

      {/* Starting Invoice Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Starting Invoice Number *</Text>
        <View style={styles.inputContainer}>
          <Hash size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={startingNumber}
            onChangeText={handleStartingNumberChange}
            placeholder="1"
            placeholderTextColor="#999999"
            keyboardType="numeric"
            maxLength={6}
          />
        </View>
        <Text style={styles.hint}>The first invoice will start from this number</Text>
      </View>

      {/* Pattern Builder */}
      <View style={styles.patternGroup}>
        <Text style={styles.label}>Invoice Pattern *</Text>
        
        {/* Selected Pattern Display */}
        <View style={styles.patternDisplay}>
          <Text style={styles.patternLabel}>Pattern:</Text>
          <Text style={styles.patternText}>
            {selectedItems.length > 0 ? selectedItems.map(item => {
              switch (item.type) {
                case 'prefix':
                  return item.value;
                case 'year':
                  return item.format === 'fiscal' ? 'YYYY-YY' : 'YYYY';
                case 'month':
                  return item.format === 'short' ? 'MMM' : 
                         item.format === 'full' ? 'MMMM' : 'MM';
                case 'number':
                  return '####';
                default:
                  return item.value;
              }
            }).join('-') : 'Select components below'}
          </Text>
        </View>

        {/* Selected Items - Reorderable */}
        <View style={styles.selectedContainer}>
          {selectedItems.map((item, index) => (
            <View key={item.id}>
              {renderItem(item, index)}
            </View>
          ))}
        </View>

        {/* Available Options */}
        <View style={styles.availableContainer}>
          <Text style={styles.availableLabel}>Add Optional Components:</Text>
          <View style={styles.availableItems}>
            {availableItems.map((item) => {
              const isSelected = selectedItems.some(selected => selected.type === item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.availableItem,
                    isSelected && styles.disabledItem
                  ]}
                  onPress={() => handleAddItem(item)}
                  disabled={isSelected}
                >
                  {item.icon}
                  <Text style={[
                    styles.availableItemLabel,
                    isSelected && styles.disabledItemText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.dragHint}>💡 Use arrows to rearrange the pattern</Text>
        </View>

        {/* Preview - Moved to bottom */}
        <View style={styles.previewDisplay}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <Text style={styles.previewText}>{getPreviewPattern()}</Text>
        </View>
      </View>

    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  patternGroup: {
    gap: 16,
  },
  patternDisplay: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  patternLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  patternText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F66AC',
    fontFamily: 'monospace',
  },
  previewDisplay: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
    fontFamily: 'monospace',
  },
  selectedContainer: {
    gap: 8,
  },
  selectedItem: {
    backgroundColor: '#3F66AC',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.15,
    elevation: 3,
    overflow: 'hidden',
  },
  tapHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 12,
    paddingTop: 8,
    fontStyle: 'italic',
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 50,
  },
  selectedItemContent: {
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 3,
  },
  reorderButton: {
    width: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.3,
    elevation: 2,
  },
  reorderButtonDisabled: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    shadowOpacity: 0,
    elevation: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  selectedItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  formatBadgeInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  removeButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonTextSmall: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  availableContainer: {
    gap: 14,
  },
  availableLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  availableItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  availableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3F66AC',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#3F66AC',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  disabledItem: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  availableItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3F66AC',
    marginLeft: 8,
  },
  disabledItemText: {
    color: '#9ca3af',
  },
  dragHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Dropdown styles
  dropdown: {
    backgroundColor: '#2d4f8f',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedDropdownOption: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  dropdownOptionContent: {
    flex: 1,
  },
  dropdownOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  dropdownOptionPreview: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
  },
  selectedDropdownText: {
    color: '#fbbf24',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default InvoicePatternConfig;
