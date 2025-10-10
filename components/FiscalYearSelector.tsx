import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Calendar, Check } from 'lucide-react-native';

interface FiscalYearSelectorProps {
  onFiscalYearChange: (fiscalYear: 'JAN-DEC' | 'APR-MAR') => void;
  initialValue?: 'JAN-DEC' | 'APR-MAR';
}

const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({
  onFiscalYearChange,
  initialValue = 'APR-MAR',
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<'JAN-DEC' | 'APR-MAR'>(initialValue);

  const fiscalYearOptions = [
    {
      id: 'JAN-DEC' as const,
      label: 'January - December',
      description: 'Calendar Year (Jan 1 - Dec 31)',
      icon: <Calendar size={20} color="#3F66AC" />,
    },
    {
      id: 'APR-MAR' as const,
      label: 'April - March',
      description: 'Financial Year (Apr 1 - Mar 31)',
      icon: <Calendar size={20} color="#3F66AC" />,
    },
  ];

  const handleSelect = (fiscalYear: 'JAN-DEC' | 'APR-MAR') => {
    setSelectedFiscalYear(fiscalYear);
    onFiscalYearChange(fiscalYear);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fiscal Year *</Text>
      <Text style={styles.hint}>Choose your business financial year period</Text>
      
      <View style={styles.optionsContainer}>
        {fiscalYearOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              selectedFiscalYear === option.id && styles.selectedOption,
            ]}
            onPress={() => handleSelect(option.id)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                {option.icon}
                <Text style={[
                  styles.optionLabel,
                  selectedFiscalYear === option.id && styles.selectedOptionLabel,
                ]}>
                  {option.label}
                </Text>
                {selectedFiscalYear === option.id && (
                  <View style={styles.checkIcon}>
                    <Check size={16} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={[
                styles.optionDescription,
                selectedFiscalYear === option.id && styles.selectedOptionDescription,
              ]}>
                {option.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 <Text style={styles.infoBold}>Tip:</Text> Most Indian businesses use April-March financial year to align with tax reporting requirements.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  selectedOption: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  optionContent: {
    gap: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  selectedOptionLabel: {
    color: '#047857',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 32,
  },
  selectedOptionDescription: {
    color: '#047857',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  infoBold: {
    fontWeight: '600',
  },
});

export default FiscalYearSelector;

