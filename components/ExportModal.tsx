import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, FileText, FileSpreadsheet, FileJson, FileDown } from 'lucide-react-native';
import { ExportFormat, ExportConfig, exportData } from '@/utils/exportUtils';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  },
};

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  config: ExportConfig;
}

const FORMAT_OPTIONS: { format: ExportFormat; label: string; description: string; icon: typeof FileText; color: string }[] = [
  { format: 'pdf', label: 'PDF', description: 'Best for printing & sharing', icon: FileText, color: '#DC2626' },
  { format: 'csv', label: 'CSV', description: 'For spreadsheets & databases', icon: FileDown, color: '#059669' },
  { format: 'excel', label: 'Excel', description: 'Microsoft Excel format', icon: FileSpreadsheet, color: '#047857' },
  { format: 'json', label: 'JSON', description: 'Structured data format', icon: FileJson, color: '#7C3AED' },
];

const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose, config }) => {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      await exportData(config, format);
    } finally {
      setExporting(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Export Data</Text>
              <Text style={styles.subtitle}>{config.data.length} records</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={24} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {FORMAT_OPTIONS.map(({ format, label, description, icon: Icon, color }) => (
              <TouchableOpacity
                key={format}
                style={[styles.optionCard, exporting === format && styles.optionCardActive]}
                onPress={() => handleExport(format)}
                activeOpacity={0.7}
                disabled={exporting !== null}
              >
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                  {exporting === format ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <Icon size={22} color={color} />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.optionDescription}>{description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  optionsContainer: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 14,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
});

export default ExportModal;
