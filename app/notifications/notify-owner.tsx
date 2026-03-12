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
  Briefcase,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Eye,
  X,
  Bell,
  Check,
} from 'lucide-react-native';
import { createInAppNotification } from '@/services/backendApi';
import { usePermissions } from '@/contexts/PermissionContext';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/lib/supabase';

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
  'Issue',
  'Request',
  'Others',
];

export default function NotifyOwnerScreen() {
  const { staffBusinessId, staffId, staffName } = usePermissions();
  const { data: businessData } = useBusinessData();
  const effectiveBusinessId = staffBusinessId || businessData?.business?.id;

  const [notificationType, setNotificationType] = useState('');
  const [customType, setCustomType] = useState('');
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleRecordMessage = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      Alert.alert('Recording Started', 'Recording your message...');
    } else {
      Alert.alert('Recording Stopped', 'Message recorded successfully!');
    }
  };

  const isFormValid = () => {
    return (
      notificationType.trim().length > 0 &&
      (notificationType !== 'Others' || customType.trim().length > 0) &&
      message.trim().length > 0
    );
  };

  const handlePreview = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleSend = async () => {
    if (!message.trim() || !effectiveBusinessId) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    setIsSending(true);

    try {
      const senderDisplayName = staffName || 'Staff';
      const notifTitle = notificationType === 'Others'
        ? customType || 'Notification'
        : notificationType;

      const { data: ownerRow } = await supabase
        .from('users')
        .select('id, name')
        .eq('business_id', effectiveBusinessId)
        .eq('role', 'Owner')
        .maybeSingle();

      if (!ownerRow) {
        Alert.alert('Error', 'Could not find the business owner.');
        setIsSending(false);
        return;
      }

      await createInAppNotification({
        businessId: effectiveBusinessId,
        recipientId: ownerRow.id,
        recipientType: 'owner',
        title: notifTitle,
        message: message,
        type: 'info',
        category: 'staff_notification',
        sourceStaffId: staffId || undefined,
        sourceStaffName: senderDisplayName,
      });

      setShowPreviewModal(false);
      Alert.alert('Success', 'Notification sent to the business owner.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send notification.');
    } finally {
      setIsSending(false);
    }
  };

  const getNotificationTypeDisplay = () => {
    if (!notificationType) return 'Select notification type';
    if (notificationType === 'Others') {
      return customType || 'Specify notification type';
    }
    return notificationType;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notify Business Owner</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipient info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipient</Text>
            <View style={styles.recipientCard}>
              <View style={styles.recipientAvatar}>
                <Briefcase size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recipientName}>{businessData?.business?.businessName || 'Business Owner'}</Text>
                <Text style={styles.recipientRole}>Owner</Text>
              </View>
            </View>
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
                  !notificationType && styles.placeholderText
                ]}>
                  {getNotificationTypeDisplay()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Custom Type */}
          {notificationType === 'Others' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specify Notification Type *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={customType}
                  onChangeText={setCustomType}
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
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingButton]}
                onPress={handleRecordMessage}
                activeOpacity={0.7}
              >
                {isRecording ? (
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
              style={[styles.previewButton, !isFormValid() && styles.disabledButton]}
              onPress={handlePreview}
              activeOpacity={0.8}
              disabled={!isFormValid()}
            >
              <Eye size={20} color={Colors.background} />
              <Text style={styles.previewButtonText}>Preview & Send</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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
                <TouchableOpacity onPress={() => setShowTypeModal(false)} activeOpacity={0.7}>
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.typeList}>
                {notificationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeItem, notificationType === type && styles.selectedTypeItem]}
                    onPress={() => {
                      setNotificationType(type);
                      if (type !== 'Others') setCustomType('');
                      setShowTypeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeText, notificationType === type && styles.selectedTypeText]}>
                      {type}
                    </Text>
                    {notificationType === type && <Check size={20} color={Colors.primary} />}
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
                <TouchableOpacity onPress={() => setShowPreviewModal(false)} activeOpacity={0.7}>
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.previewContent}>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>To:</Text>
                  <Text style={styles.previewValue}>Business Owner</Text>
                </View>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Type:</Text>
                  <Text style={styles.previewValue}>
                    {notificationType === 'Others' ? customType : notificationType}
                  </Text>
                </View>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Message:</Text>
                  <Text style={styles.previewValue}>{message}</Text>
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
                  style={[styles.sendButton, isSending && styles.sendingButton]}
                  onPress={handleSend}
                  activeOpacity={0.8}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Text style={styles.sendButtonText}>Sending...</Text>
                  ) : (
                    <>
                      <Send size={20} color={Colors.background} />
                      <Text style={styles.sendButtonText}>Send</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
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
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.grey[100],
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  recipientCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grey[50],
    borderRadius: 12, borderWidth: 1, borderColor: Colors.grey[200], padding: 16, gap: 14,
  },
  recipientAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  recipientName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  recipientRole: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  dropdown: {
    backgroundColor: Colors.grey[50], borderRadius: 12,
    borderWidth: 1, borderColor: Colors.grey[200], paddingHorizontal: 16, paddingVertical: 16,
  },
  dropdownContent: { flexDirection: 'row', alignItems: 'center' },
  dropdownText: { fontSize: 16, color: Colors.text, marginLeft: 12, flex: 1 },
  placeholderText: { color: Colors.textLight },
  inputContainer: {
    backgroundColor: Colors.grey[50], borderRadius: 12,
    borderWidth: 1, borderColor: Colors.grey[200], paddingHorizontal: 16, paddingVertical: 16,
  },
  input: { fontSize: 16, color: Colors.text },
  messageContainer: { position: 'relative' as const },
  messageInput: {
    backgroundColor: Colors.grey[50], borderRadius: 12,
    borderWidth: 1, borderColor: Colors.grey[200],
    paddingHorizontal: 16, paddingVertical: 16, paddingRight: 60,
    fontSize: 16, color: Colors.text, minHeight: 120, textAlignVertical: 'top' as const,
  },
  recordButton: {
    position: 'absolute' as const, bottom: 12, right: 12,
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.grey[100],
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  recordingButton: { backgroundColor: '#FEE2E2' },
  buttonContainer: {
    flexDirection: 'row' as const, gap: 12, marginTop: 8, marginBottom: 40,
  },
  cancelButton: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8, paddingVertical: 16,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  previewButton: {
    flex: 2, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8, paddingVertical: 16,
    borderRadius: 12, backgroundColor: Colors.primary,
  },
  previewButtonText: { fontSize: 16, fontWeight: '600', color: Colors.background },
  disabledButton: { opacity: 0.5 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const, alignItems: 'center' as const, padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background, borderRadius: 16,
    width: '100%' as const, maxHeight: '80%' as const, overflow: 'hidden' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.grey[200],
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  typeList: { maxHeight: 400 },
  typeItem: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grey[100],
  },
  selectedTypeItem: { backgroundColor: '#EEF2FF' },
  typeText: { fontSize: 16, color: Colors.text },
  selectedTypeText: { color: Colors.primary, fontWeight: '600' },
  previewContent: { padding: 16, maxHeight: 300 },
  previewSection: { marginBottom: 16 },
  previewLabel: { fontSize: 13, color: Colors.textLight, marginBottom: 4, fontWeight: '600' },
  previewValue: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  previewActions: {
    flexDirection: 'row' as const, gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.grey[200],
  },
  cancelPreviewButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.grey[200],
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  cancelPreviewButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  sendButton: {
    flex: 2, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8, paddingVertical: 14,
    borderRadius: 12, backgroundColor: Colors.success,
  },
  sendingButton: { opacity: 0.7 },
  sendButtonText: { fontSize: 16, fontWeight: '600', color: Colors.background },
});
