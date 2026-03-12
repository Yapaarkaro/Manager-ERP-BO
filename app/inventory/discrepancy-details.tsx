import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Package, PackageMinus, PackagePlus, TriangleAlert as AlertTriangle, Eye, FileText, User, Calendar, MapPin, Hash, Building2, Phone, Mail, Clock, Edit3, Check, X, MessageSquare, Download, Camera, Images } from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { useBusinessData } from '@/hooks/useBusinessData';
import { generateInvoicePDF, InvoicePDFData } from '@/utils/invoicePdfGenerator';
import { shareInvoicePDF } from '@/utils/invoiceShareUtils';
import * as ImagePicker from 'expo-image-picker';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  orange: '#EA580C',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

export default function DiscrepancyDetailsScreen() {
  const { discrepancyId, discrepancyData } = useLocalSearchParams();
  const { data: businessData } = useBusinessData();
  const discrepancy = JSON.parse(discrepancyData as string);
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [currentStatus, setCurrentStatus] = useState(discrepancy.status);
  const [evidenceImages, setEvidenceImages] = useState<string[]>(discrepancy.evidenceImages || []);

  const statusOptions = [
    { value: 'pending', label: 'Pending Investigation', color: Colors.error },
    { value: 'investigating', label: 'Under Investigation', color: Colors.warning },
    { value: 'resolved', label: 'Resolved', color: Colors.success },
    { value: 'acknowledged', label: 'Acknowledged', color: Colors.primary },
  ];

  const getDiscrepancyTypeColor = (type: string) => {
    return type === 'shortage' ? Colors.error : Colors.orange;
  };

  const getDiscrepancyTypeIcon = (type: string) => {
    return type === 'shortage' ? PackageMinus : PackagePlus;
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || Colors.textLight;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return Colors.error;
      case 'high': return Colors.warning;
      case 'medium': return Colors.orange;
      case 'low': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewInvoice = () => {
    if (!discrepancy.relatedInvoice) return;

    const invoice = discrepancy.relatedInvoice;
    
    if (invoice.type === 'return') {
      // Navigate to return details
      const returnInvoiceData = {
        id: invoice.id,
        returnNumber: invoice.invoiceNumber,
        originalInvoiceNumber: '',
        customerName: invoice.customerName || 'N/A',
        customerType: 'business',
        staffName: discrepancy.reportedBy.name,
        staffAvatar: discrepancy.reportedBy.avatar,
        refundStatus: 'refunded',
        amount: invoice.amount,
        itemCount: discrepancy.discrepancyQuantity,
        date: invoice.date,
        reason: 'Product return',
        customerDetails: {
          name: invoice.customerName || 'N/A',
          mobile: '',
          address: ''
        }
      };

      safeRouter.push({
        pathname: '/return-details',
        params: {
          returnId: returnInvoiceData.id,
          returnData: JSON.stringify(returnInvoiceData)
        }
      });
    } else {
      // Navigate to invoice details
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName || invoice.supplierName || 'N/A',
        customerType: invoice.type === 'purchase' ? 'business' : 'individual',
        staffName: discrepancy.reportedBy.name,
        staffAvatar: discrepancy.reportedBy.avatar,
        paymentStatus: 'paid',
        amount: invoice.amount,
        itemCount: discrepancy.discrepancyQuantity,
        date: invoice.date,
        customerDetails: {
          name: invoice.customerName || invoice.supplierName || 'N/A',
          mobile: '',
          businessName: invoice.type === 'purchase' ? invoice.supplierName : invoice.customerName,
          address: ''
        }
      };

      safeRouter.push({
        pathname: '/invoice-details',
        params: {
          invoiceId: invoiceData.id,
          invoiceData: JSON.stringify(invoiceData)
        }
      });
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    setCurrentStatus(newStatus);
    setShowStatusModal(false);
    Alert.alert('Status Updated', `Discrepancy status changed to ${newStatus}`);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      Alert.alert('Empty Note', 'Please enter a note');
      return;
    }

    // In a real app, this would save to backend
    Alert.alert('Note Added', 'Investigation note has been added');
    setNewNote('');
    setShowNotesModal(false);
  };

  const handleDownloadReport = async () => {
    try {
      const pdfData: InvoicePDFData = {
        type: 'stock_discrepancy',
        invoiceNumber: `DISC-${discrepancy.id || discrepancyId}`,
        invoiceDate: discrepancy.reportedDate || discrepancy.date || new Date().toISOString(),
        business: {
          name: businessData?.business?.legal_name || businessData?.business?.owner_name || '',
          gstin: businessData?.business?.tax_id || '',
        },
        items: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: discrepancy.value || 0,
        discrepancyDetails: {
          productName: discrepancy.productName || discrepancy.product || '',
          expectedStock: discrepancy.expectedQuantity || discrepancy.systemStock || 0,
          actualStock: discrepancy.actualQuantity || discrepancy.physicalStock || 0,
          discrepancyQty: discrepancy.discrepancyQuantity || discrepancy.difference || 0,
          value: discrepancy.value || 0,
          reason: discrepancy.reason,
          investigationNotes: discrepancy.investigationNotes || discrepancy.notes,
        },
        staffName: discrepancy.reportedBy?.name,
        businessId: businessData?.business?.id,
      };
      const fileUri = await generateInvoicePDF(pdfData);
      await shareInvoicePDF(fileUri, pdfData.invoiceNumber);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not generate report');
    }
  };

  const pickImageFromGallery = async () => {
    setShowImagePickerModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload evidence images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setEvidenceImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const takePhoto = async () => {
    setShowImagePickerModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take evidence photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setEvidenceImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeEvidenceImage = (index: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          else if (buttonIndex === 2) pickImageFromGallery();
        }
      );
    } else {
      setShowImagePickerModal(true);
    }
  };

  const DiscrepancyIcon = getDiscrepancyTypeIcon(discrepancy.discrepancyType);
  const discrepancyColor = getDiscrepancyTypeColor(discrepancy.discrepancyType);
  const statusColor = getStatusColor(currentStatus);
  const priorityColor = getPriorityColor(discrepancy.priority);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Discrepancy Details</Text>
        
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleDownloadReport}
            activeOpacity={0.7}
          >
            <Download size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowStatusModal(true)}
            activeOpacity={0.7}
          >
            <Edit3 size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Discrepancy Header */}
        <View style={[
          styles.discrepancyHeader,
          { borderLeftColor: discrepancyColor }
        ]}>
          <View style={styles.discrepancyHeaderTop}>
            <View style={[
              styles.discrepancyTypeContainer,
              { backgroundColor: `${discrepancyColor}20` }
            ]}>
              <DiscrepancyIcon size={24} color={discrepancyColor} />
              <Text style={[
                styles.discrepancyTypeText,
                { color: discrepancyColor }
              ]}>
                {discrepancy.discrepancyType.toUpperCase()} DISCREPANCY
              </Text>
            </View>
            
            <Text style={styles.discrepancyIdText}>
              {discrepancy.id}
            </Text>
          </View>

          <View style={styles.discrepancyQuantitySection}>
            <Text style={styles.discrepancyQuantityLabel}>
              {discrepancy.discrepancyType === 'shortage' ? 'Missing' : 'Extra'} Quantity
            </Text>
            <Text style={[
              styles.discrepancyQuantityValue,
              { color: discrepancyColor }
            ]}>
              {discrepancy.discrepancyType === 'shortage' ? '-' : '+'}
              {discrepancy.discrepancyQuantity} units
            </Text>
            <Text style={styles.discrepancyValueText}>
              Value: {formatAmount(discrepancy.discrepancyValue)}
            </Text>
          </View>
        </View>

        {/* Product Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Information</Text>
          <View style={styles.productCard}>
            <Image 
              source={{ uri: discrepancy.productImage }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{discrepancy.productName}</Text>
              <Text style={styles.productCategory}>{discrepancy.category}</Text>
              <Text style={styles.productPrice}>
                Unit Price: {formatAmount(discrepancy.unitPrice)}
              </Text>
              <Text style={styles.productLocation}>
                Location: {discrepancy.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Details</Text>
          <View style={styles.stockDetailsCard}>
            <View style={styles.stockDetailRow}>
              <Text style={styles.stockDetailLabel}>Expected Stock:</Text>
              <Text style={styles.stockDetailValue}>
                {discrepancy.expectedStock} units
              </Text>
            </View>
            
            <View style={styles.stockDetailRow}>
              <Text style={styles.stockDetailLabel}>Actual Stock:</Text>
              <Text style={[
                styles.stockDetailValue,
                { color: discrepancyColor }
              ]}>
                {discrepancy.actualStock} units
              </Text>
            </View>
            
            <View style={[styles.stockDetailRow, styles.discrepancyRow]}>
              <Text style={[styles.stockDetailLabel, styles.discrepancyLabel]}>
                Discrepancy:
              </Text>
              <Text style={[
                styles.stockDetailValue,
                styles.discrepancyValueBold,
                { color: discrepancyColor }
              ]}>
                {discrepancy.discrepancyType === 'shortage' ? '-' : '+'}
                {discrepancy.discrepancyQuantity} units
              </Text>
            </View>
          </View>
        </View>

        {/* Reported By */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reported By</Text>
          <View style={styles.reportedByCard}>
            <View style={styles.reportedByHeader}>
              <Image 
                source={{ uri: discrepancy.reportedBy.avatar }}
                style={styles.staffAvatar}
              />
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>
                  {discrepancy.reportedBy.name}
                </Text>
                <Text style={styles.staffRole}>
                  {discrepancy.reportedBy.role}
                </Text>
                <Text style={styles.reportedDate}>
                  Reported on {formatDate(discrepancy.reportedDate)}
                </Text>
              </View>
            </View>
            
            {discrepancy.reason && (
              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{discrepancy.reason}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Related Invoice */}
        {discrepancy.relatedInvoice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Invoice</Text>
            <View style={styles.relatedInvoiceCard}>
              <View style={styles.relatedInvoiceHeader}>
                <FileText size={24} color={Colors.primary} />
                <View style={styles.relatedInvoiceInfo}>
                  <Text style={styles.relatedInvoiceNumber}>
                    {discrepancy.relatedInvoice.invoiceNumber}
                  </Text>
                  <Text style={styles.relatedInvoiceType}>
                    {discrepancy.relatedInvoice.type.toUpperCase()} INVOICE
                  </Text>
                  <Text style={styles.relatedInvoiceDate}>
                    {formatDate(discrepancy.relatedInvoice.date)}
                  </Text>
                </View>
                <View style={styles.relatedInvoiceAmount}>
                  <Text style={styles.relatedInvoiceAmountText}>
                    {formatAmount(discrepancy.relatedInvoice.amount)}
                  </Text>
                </View>
              </View>

              <View style={styles.relatedInvoiceDetails}>
                <View style={styles.relatedInvoiceDetailRow}>
                  {discrepancy.relatedInvoice.type === 'purchase' ? (
                    <Building2 size={16} color={Colors.textLight} />
                  ) : (
                    <User size={16} color={Colors.textLight} />
                  )}
                  <Text style={styles.relatedInvoiceDetailLabel}>
                    {discrepancy.relatedInvoice.type === 'purchase' ? 'Supplier:' : 'Customer:'}
                  </Text>
                  <Text style={styles.relatedInvoiceDetailValue}>
                    {discrepancy.relatedInvoice.supplierName || discrepancy.relatedInvoice.customerName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewInvoiceButton}
                onPress={handleViewInvoice}
                activeOpacity={0.7}
              >
                <Eye size={16} color={Colors.primary} />
                <Text style={styles.viewInvoiceText}>View Full Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status and Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Priority</Text>
          <View style={styles.statusPriorityCard}>
            <View style={styles.statusPriorityRow}>
              <Text style={styles.statusPriorityLabel}>Current Status:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}20` }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: statusColor }
                ]}>
                  {currentStatus.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusPriorityRow}>
              <Text style={styles.statusPriorityLabel}>Priority Level:</Text>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: `${priorityColor}20` }
              ]}>
                <Text style={[
                  styles.priorityText,
                  { color: priorityColor }
                ]}>
                  {discrepancy.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusPriorityRow}>
              <Text style={styles.statusPriorityLabel}>Last Updated:</Text>
              <Text style={styles.lastUpdatedText}>
                {formatDateTime(discrepancy.lastUpdated)}
              </Text>
            </View>
          </View>
        </View>

        {/* Evidence Images */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Evidence Images</Text>
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={handleAddImage}
              activeOpacity={0.7}
            >
              <Camera size={16} color={Colors.primary} />
              <Text style={styles.addNoteText}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {evidenceImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
              {evidenceImages.map((uri, idx) => (
                <View key={idx} style={styles.evidenceImageWrapper}>
                  <Image source={{ uri }} style={styles.evidenceImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeEvidenceImage(idx)}
                    activeOpacity={0.7}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity style={styles.notesCard} onPress={handleAddImage} activeOpacity={0.7}>
              <Camera size={24} color={Colors.textLight} style={{ marginBottom: 8 }} />
              <Text style={styles.notesPlaceholder}>
                Tap to add evidence photos from camera or gallery
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Investigation Notes */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Investigation Notes</Text>
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => setShowNotesModal(true)}
              activeOpacity={0.7}
            >
              <MessageSquare size={16} color={Colors.primary} />
              <Text style={styles.addNoteText}>Add Note</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.notesCard}>
            <Text style={styles.notesPlaceholder}>
              No investigation notes added yet. Click "Add Note" to document findings.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.updateStatusButton}
            onPress={() => setShowStatusModal(true)}
            activeOpacity={0.8}
          >
                          <Edit3 size={20} color="#ffffff" />
            <Text style={styles.updateStatusButtonText}>Update Status</Text>
          </TouchableOpacity>

          {discrepancy.relatedInvoice && (
            <TouchableOpacity
              style={styles.viewInvoiceActionButton}
              onPress={handleViewInvoice}
              activeOpacity={0.8}
            >
              <Eye size={20} color={Colors.primary} />
              <Text style={styles.viewInvoiceActionButtonText}>View Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStatusModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptions}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    currentStatus === option.value && styles.selectedStatusOption
                  ]}
                  onPress={() => handleStatusUpdate(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.statusOptionIndicator,
                    { backgroundColor: option.color }
                  ]} />
                  <Text style={[
                    styles.statusOptionText,
                    currentStatus === option.value && styles.selectedStatusOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {currentStatus === option.value && (
                    <Check size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal (Android/Web) */}
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Evidence Image</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImagePickerModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 12 }}>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.imagePickerOptionTitle}>Take Photo</Text>
                  <Text style={styles.imagePickerOptionSub}>Use camera to capture evidence</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={pickImageFromGallery}
                activeOpacity={0.7}
              >
                <Images size={24} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.imagePickerOptionTitle}>Choose from Gallery</Text>
                  <Text style={styles.imagePickerOptionSub}>Select existing photos</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={showNotesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Investigation Note</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNotesModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.noteInputContainer}>
              <TextInput
                style={styles.noteInput}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Enter investigation notes, findings, or actions taken..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={[
                  styles.addNoteSubmitButton,
                  !newNote.trim() && styles.disabledButton
                ]}
                onPress={handleAddNote}
                disabled={!newNote.trim()}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.addNoteSubmitButtonText,
                  !newNote.trim() && styles.disabledButtonText
                ]}>
                  Add Note
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },
  discrepancyHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  discrepancyHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  discrepancyTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  discrepancyTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  discrepancyIdText: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  discrepancyQuantitySection: {
    alignItems: 'center',
  },
  discrepancyQuantityLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  discrepancyQuantityValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  discrepancyValueText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 4,
  },
  productLocation: {
    fontSize: 14,
    color: Colors.textLight,
  },
  stockDetailsCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  stockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stockDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  stockDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  discrepancyRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  discrepancyLabel: {
    fontWeight: '600',
    color: Colors.text,
  },
  discrepancyValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  reportedByCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  reportedByHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  reportedDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reasonSection: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  reasonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  relatedInvoiceCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  relatedInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  relatedInvoiceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  relatedInvoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  relatedInvoiceType: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  relatedInvoiceDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  relatedInvoiceAmount: {
    alignItems: 'flex-end',
  },
  relatedInvoiceAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  relatedInvoiceDetails: {
    marginBottom: 12,
  },
  relatedInvoiceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relatedInvoiceDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  relatedInvoiceDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  viewInvoiceText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  statusPriorityCard: {
    gap: 12,
  },
  statusPriorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPriorityLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  addNoteText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
  },
  notesPlaceholder: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  updateStatusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  updateStatusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewInvoiceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  viewInvoiceActionButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptions: {
    padding: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
    gap: 12,
  },
  selectedStatusOption: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  statusOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedStatusOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noteInputContainer: {
    padding: 20,
  },
  noteInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    minHeight: 100,
    
  },
  addNoteSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addNoteSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  evidenceScroll: {
    marginTop: 4,
  },
  evidenceImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.grey[100],
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  imagePickerOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  imagePickerOptionSub: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
});