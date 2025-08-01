import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Eye,
  X,
  Check,
  User,
  Bell,
} from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface NotificationData {
  selectedStaff: string[];
  notificationType: string;
  customType: string;
  message: string;
  isRecording: boolean;
  audioUrl?: string;
}

const mockStaff: Staff[] = [
  { id: 'staff_1', name: 'John Doe', role: 'Sales Manager' },
  { id: 'staff_2', name: 'Jane Smith', role: 'Accountant' },
  { id: 'staff_3', name: 'Mike Johnson', role: 'Inventory Manager' },
  { id: 'staff_4', name: 'Sarah Wilson', role: 'Customer Service' },
  { id: 'staff_5', name: 'David Brown', role: 'Warehouse Supervisor' },
];

const notificationTypes = [
  'Sale',
  'Payments',
  'Invoices',
  'Stock In',
  'Stock Out',
  'Inventory',
  'Customers',
  'Suppliers',
  'Reports',
  'Banking',
  'Attendance',
  'Marketing',
  'Branches',
  'Warehouses',
  'Others'
];

export default function NotifyStaffScreen() {
  const [formData, setFormData] = useState<NotificationData>({
    selectedStaff: [],
    notificationType: '',
    customType: '',
    message: '',
    isRecording: false,
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const updateFormData = (field: keyof NotificationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStaffSelect = (staffId: string) => {
    const newSelectedStaff = [...formData.selectedStaff];
    const index = newSelectedStaff.indexOf(staffId);
    
    if (index > -1) {
      newSelectedStaff.splice(index, 1);
    } else {
      newSelectedStaff.push(staffId);
    }
    
    updateFormData('selectedStaff', newSelectedStaff);
  };

  const handleSelectAllStaff = () => {
    const allStaffIds = mockStaff.map(staff => staff.id);
    updateFormData('selectedStaff', allStaffIds);
  };

  const handleDeselectAllStaff = () => {
    updateFormData('selectedStaff', []);
  };

  const handleNotificationTypeSelect = (type: string) => {
    updateFormData('notificationType', type);
    if (type !== 'Others') {
      updateFormData('customType', '');
    }
    setShowTypeModal(false);
  };

  const handleRecordMessage = () => {
    // Simulate recording functionality
    updateFormData('isRecording', !formData.isRecording);
    
    if (!formData.isRecording) {
      Alert.alert('Recording Started', 'Recording your message...');
      // In a real app, this would start audio recording
    } else {
      Alert.alert('Recording Stopped', 'Message recorded successfully!');
      // In a real app, this would stop recording and save the audio
    }
  };

  const isFormValid = () => {
    return (
      formData.selectedStaff.length > 0 &&
      formData.notificationType.trim().length > 0 &&
      (formData.notificationType !== 'Others' || formData.customType.trim().length > 0) &&
      formData.message.trim().length > 0
    );
  };

  const handlePreview = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleSend = () => {
    setIsSending(true);
    
    // Simulate sending notification
    setTimeout(() => {
      setIsSending(false);
      setShowPreviewModal(false);
      Alert.alert(
        'Notification Sent',
        `Successfully sent notification to ${formData.selectedStaff.length} staff member(s)`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }, 2000);
  };

  const getSelectedStaffNames = () => {
    if (formData.selectedStaff.length === 0) return 'Select staff members';
    if (formData.selectedStaff.length === mockStaff.length) return 'All Staff';
    if (formData.selectedStaff.length === 1) {
      const staff = mockStaff.find(s => s.id === formData.selectedStaff[0]);
      return staff?.name || '';
    }
    return `${formData.selectedStaff.length} staff members selected`;
  };

  const getNotificationTypeDisplay = () => {
    if (!formData.notificationType) return 'Select notification type';
    if (formData.notificationType === 'Others') {
      return formData.customType || 'Specify notification type';
    }
    return formData.notificationType;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Notify Staff</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Staff Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Staff Members *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowStaffModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <Users size={20} color={Colors.textLight} />
                <Text style={[
                  styles.dropdownText,
                  formData.selectedStaff.length === 0 && styles.placeholderText
                ]}>
                  {getSelectedStaffNames()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notification Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Type *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTypeModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <Bell size={20} color={Colors.textLight} />
                <Text style={[
                  styles.dropdownText,
                  !formData.notificationType && styles.placeholderText
                ]}>
                  {getNotificationTypeDisplay()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Custom Type (if Others is selected) */}
          {formData.notificationType === 'Others' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specify Notification Type *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.customType}
                  onChangeText={(text) => updateFormData('customType', text)}
                  placeholder="Enter notification type"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message *</Text>
            <View style={styles.messageContainer}>
              <TextInput
                style={styles.messageInput}
                value={formData.message}
                onChangeText={(text) => updateFormData('message', text)}
                placeholder="Type your message here..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  formData.isRecording && styles.recordingButton
                ]}
                onPress={handleRecordMessage}
                activeOpacity={0.7}
              >
                {formData.isRecording ? (
                  <MicOff size={20} color={Colors.error} />
                ) : (
                  <Mic size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <X size={20} color={Colors.text} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.previewButton,
                !isFormValid() && styles.disabledButton
              ]}
              onPress={handlePreview}
              activeOpacity={0.8}
              disabled={!isFormValid()}
            >
              <Eye size={20} color={Colors.background} />
              <Text style={styles.previewButtonText}>Preview & Send</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Staff Selection Modal */}
        <Modal
          visible={showStaffModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStaffModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Staff Members</Text>
                <TouchableOpacity
                  onPress={() => setShowStaffModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSelectAllStaff}
                  activeOpacity={0.7}
                >
                  <Check size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Select All</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDeselectAllStaff}
                  activeOpacity={0.7}
                >
                  <X size={16} color={Colors.error} />
                  <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                    Deselect All
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.staffList}>
                {mockStaff.map((staff) => (
                  <TouchableOpacity
                    key={staff.id}
                    style={[
                      styles.staffItem,
                      formData.selectedStaff.includes(staff.id) && styles.selectedStaffItem
                    ]}
                    onPress={() => handleStaffSelect(staff.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.staffInfo}>
                      <View style={styles.staffAvatar}>
                        <User size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.staffDetails}>
                        <Text style={styles.staffName}>{staff.name}</Text>
                        <Text style={styles.staffRole}>{staff.role}</Text>
                      </View>
                    </View>
                    
                    {formData.selectedStaff.includes(staff.id) && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Notification Type Modal */}
        <Modal
          visible={showTypeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Notification Type</Text>
                <TouchableOpacity
                  onPress={() => setShowTypeModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.typeList}>
                {notificationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeItem,
                      formData.notificationType === type && styles.selectedTypeItem
                    ]}
                    onPress={() => handleNotificationTypeSelect(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeText,
                      formData.notificationType === type && styles.selectedTypeText
                    ]}>
                      {type}
                    </Text>
                    {formData.notificationType === type && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Preview Modal */}
        <Modal
          visible={showPreviewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notification Preview</Text>
                <TouchableOpacity
                  onPress={() => setShowPreviewModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.previewContent}>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Recipients:</Text>
                  <Text style={styles.previewValue}>
                    {formData.selectedStaff.length === mockStaff.length 
                      ? 'All Staff' 
                      : mockStaff
                          .filter(staff => formData.selectedStaff.includes(staff.id))
                          .map(staff => staff.name)
                          .join(', ')
                    }
                  </Text>
                </View>
                
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Notification Type:</Text>
                  <Text style={styles.previewValue}>
                    {formData.notificationType === 'Others' 
                      ? formData.customType 
                      : formData.notificationType
                    }
                  </Text>
                </View>
                
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Message:</Text>
                  <Text style={styles.previewValue}>{formData.message}</Text>
                </View>
              </ScrollView>
              
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.cancelPreviewButton}
                  onPress={() => setShowPreviewModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelPreviewButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isSending && styles.sendingButton
                  ]}
                  onPress={handleSend}
                  activeOpacity={0.8}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Text style={styles.sendButtonText}>Sending...</Text>
                  ) : (
                    <>
                      <Send size={20} color={Colors.background} />
                      <Text style={styles.sendButtonText}>Send Notification</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  inputContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
  },
  messageContainer: {
    position: 'relative',
  },
  messageInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 60,
    fontSize: 16,
    color: Colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  recordButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: Colors.error + '20',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  previewButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  staffList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  staffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedStaffItem: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  typeList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedTypeItem: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedTypeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  previewContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  cancelPreviewButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
  },
  cancelPreviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  sendingButton: {
    backgroundColor: Colors.grey[300],
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
}); 