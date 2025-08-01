import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  IndianRupee, 
  Users, 
  Target,
  X,
  Plus,
  CheckCircle
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

interface CampaignFormData {
  name: string;
  platform: string;
  startDate: string;
  endDate: string;
  startDateDisplay: string;
  endDateDisplay: string;
  budget: string;
  targetAudience: string[];
  objective: string;
}

const platforms = [
  { name: 'WhatsApp', minBudget: 5000 },
  { name: 'Email', minBudget: 2500 },
  { name: 'Instagram', minBudget: 10000 },
  { name: 'Facebook', minBudget: 10000 },
  { name: 'Google', minBudget: 5000 },
  { name: 'Offline ads', minBudget: 5000 },
];

const targetAudienceOptions = [
  'my existing customers',
  'my business city',
  'young adults 18-24',
  'professionals 25-34',
  'male audience',
  'female audience',
  'others'
];

const campaignObjectives = [
  'Brand awareness and reach',
  'Increase sales and customer engagement',
  'Drive website traffic and leads',
  'Generate qualified leads',
  'Promote new products/services',
  'Customer retention and loyalty',
  'Market expansion',
  'Others'
];

export default function AddCampaignScreen() {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    platform: '',
    startDate: '',
    endDate: '',
    startDateDisplay: '',
    endDateDisplay: '',
    budget: '',
    targetAudience: [],
    objective: '',
  });

  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [showEndDateModal, setShowEndDateModal] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof CampaignFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformSelect = (platform: string) => {
    updateFormData('platform', platform);
    setShowPlatformModal(false);
  };

  const handleAudienceSelect = (audience: string) => {
    if (audience === 'others') {
      setShowAudienceModal(false);
      // Handle custom audience input
      return;
    }
    
    const newAudience = selectedAudience.includes(audience)
      ? selectedAudience.filter(aud => aud !== audience)
      : [...selectedAudience, audience];
    
    setSelectedAudience(newAudience);
    updateFormData('targetAudience', newAudience);
  };

  const handleObjectiveSelect = (objective: string) => {
    updateFormData('objective', objective);
    setShowObjectiveModal(false);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  const parseDateInput = (input: string) => {
    // Handle DD-MM-YYYY format
    const parts = input.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      
      if (day && month >= 0 && month <= 11 && year) {
        const date = new Date(year, month, day);
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD for storage
        }
      }
    }
    return null;
  };

  const handleDateInput = (dateType: 'startDate' | 'endDate', input: string) => {
    // Allow only numbers and hyphens
    const cleaned = input.replace(/[^0-9-]/g, '');
    
    // Auto-format as user types
    let formatted = cleaned;
    if (cleaned.length >= 2 && !cleaned.includes('-')) {
      formatted = cleaned.slice(0, 2) + '-' + cleaned.slice(2);
    }
    if (formatted.length >= 5 && formatted.split('-').length === 2) {
      formatted = formatted.slice(0, 5) + '-' + formatted.slice(5);
    }
    
    // Limit to DD-MM-YYYY format
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    // Store the formatted display value
    if (dateType === 'startDate') {
      setFormData(prev => ({ ...prev, startDateDisplay: formatted }));
    } else {
      setFormData(prev => ({ ...prev, endDateDisplay: formatted }));
    }
    
    // Try to parse and store the actual date
    const parsedDate = parseDateInput(formatted);
    if (parsedDate) {
      updateFormData(dateType, parsedDate);
    }
  };

  const getMinBudget = () => {
    const selectedPlatform = platforms.find(p => p.name === formData.platform);
    return selectedPlatform ? selectedPlatform.minBudget : 0;
  };

  const isFormValid = () => {
    const minBudget = getMinBudget();
    const budget = parseInt(formData.budget) || 0;
    
    // Check if end date is after start date
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const isEndDateValid = endDate > startDate;
    
    return (
      formData.name.trim().length > 0 &&
      formData.platform.trim().length > 0 &&
      formData.startDate.trim().length > 0 &&
      formData.endDate.trim().length > 0 &&
      isEndDateValid &&
      budget >= minBudget &&
      formData.targetAudience.length > 0 &&
      formData.objective.trim().length > 0
    );
  };

  const handleContinue = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields and ensure budget meets minimum requirements');
      return;
    }

    router.push({
      pathname: '/marketing/payment',
      params: {
        campaignData: JSON.stringify(formData)
      }
    });
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
          
          <Text style={styles.headerTitle}>Create New Campaign</Text>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Campaign Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campaign Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Campaign Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => updateFormData('name', text)}
                    placeholder="Enter campaign name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Platform *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowPlatformModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.platform && styles.placeholderText
                  ]}>
                    {formData.platform || 'Select platform'}
                  </Text>
                  <Plus size={20} color={Colors.textLight} />
                </TouchableOpacity>
                {formData.platform && (
                  <Text style={styles.minBudgetText}>
                    Minimum budget: ₹{getMinBudget().toLocaleString()}
                  </Text>
                )}
              </View>

              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Start Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDateModal(true)}
                    activeOpacity={0.7}
                  >
                    <Calendar size={20} color={Colors.textLight} />
                                          <Text style={[
                        styles.dateButtonText,
                        !formData.startDateDisplay && styles.placeholderText
                      ]}>
                        {formData.startDateDisplay || 'Select start date'}
                      </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>End Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDateModal(true)}
                    activeOpacity={0.7}
                  >
                    <Calendar size={20} color={Colors.textLight} />
                                          <Text style={[
                        styles.dateButtonText,
                        !formData.endDateDisplay && styles.placeholderText
                      ]}>
                        {formData.endDateDisplay || 'Select end date'}
                      </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Campaign Budget (₹) *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.budget}
                    onChangeText={(text) => updateFormData('budget', text.replace(/[^0-9]/g, ''))}
                    placeholder="Enter budget amount"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
                {formData.budget && parseInt(formData.budget) < getMinBudget() && (
                  <Text style={styles.errorText}>
                    Budget must be at least ₹{getMinBudget().toLocaleString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Target Audience */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target Audience</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Target Audience *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowAudienceModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    selectedAudience.length === 0 && styles.placeholderText
                  ]}>
                    {selectedAudience.length > 0 
                      ? `${selectedAudience.length} audience${selectedAudience.length > 1 ? 's' : ''} selected`
                      : 'Select target audience'
                    }
                  </Text>
                  <Plus size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Campaign Objective */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campaign Objective</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Objective *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowObjectiveModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.objective && styles.placeholderText
                  ]}>
                    {formData.objective || 'Select campaign objective'}
                  </Text>
                  <Plus size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Continue Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid()}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              Continue to Payment
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Platform Selection Modal */}
      <Modal
        visible={showPlatformModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlatformModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Platform</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPlatformModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {platforms.map((platform) => (
                <TouchableOpacity
                  key={platform.name}
                  style={[
                    styles.modalItem,
                    formData.platform === platform.name && styles.selectedOption
                  ]}
                  onPress={() => handlePlatformSelect(platform.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemText,
                      formData.platform === platform.name && styles.selectedOptionText
                    ]}>
                      {platform.name}
                    </Text>
                    <Text style={styles.minBudgetLabel}>
                      Min: ₹{platform.minBudget.toLocaleString()}
                    </Text>
                  </View>
                  {formData.platform === platform.name && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle size={20} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Target Audience Modal */}
      <Modal
        visible={showAudienceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAudienceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Target Audience</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAudienceModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {targetAudienceOptions.map((audience) => (
                <TouchableOpacity
                  key={audience}
                  style={[
                    styles.modalItem,
                    selectedAudience.includes(audience) && styles.selectedOption
                  ]}
                  onPress={() => handleAudienceSelect(audience)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedAudience.includes(audience) && styles.selectedOptionText
                  ]}>
                    {audience}
                  </Text>
                  {selectedAudience.includes(audience) && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle size={20} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowAudienceModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Campaign Objective Modal */}
      <Modal
        visible={showObjectiveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowObjectiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Campaign Objective</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowObjectiveModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {campaignObjectives.map((objective) => (
                <TouchableOpacity
                  key={objective}
                  style={[
                    styles.modalItem,
                    formData.objective === objective && styles.selectedOption
                  ]}
                  onPress={() => handleObjectiveSelect(objective)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.objective === objective && styles.selectedOptionText
                  ]}>
                    {objective}
                  </Text>
                  {formData.objective === objective && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle size={20} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
             </Modal>

       {/* Start Date Calendar Modal */}
       <Modal
         visible={showStartDateModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowStartDateModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Start Date</Text>
               <TouchableOpacity
                 style={styles.closeButton}
                 onPress={() => setShowStartDateModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.text} />
               </TouchableOpacity>
             </View>

             <View style={styles.calendarContainer}>
               <Text style={styles.calendarTitle}>Select Start Date</Text>
               <View style={styles.dateInputContainer}>
                 <TextInput
                   style={styles.dateInput}
                   placeholder="DD-MM-YYYY"
                   placeholderTextColor={Colors.textLight}
                   value={formData.startDateDisplay}
                   onChangeText={(text) => handleDateInput('startDate', text)}
                   keyboardType="numeric"
                   maxLength={10}
                 />
               </View>
               <TouchableOpacity
                 style={styles.confirmDateButton}
                 onPress={() => setShowStartDateModal(false)}
                 activeOpacity={0.7}
               >
                 <Text style={styles.confirmDateButtonText}>Confirm</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>

       {/* End Date Calendar Modal */}
       <Modal
         visible={showEndDateModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowEndDateModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select End Date</Text>
               <TouchableOpacity
                 style={styles.closeButton}
                 onPress={() => setShowEndDateModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.text} />
               </TouchableOpacity>
             </View>

             <View style={styles.calendarContainer}>
               <Text style={styles.calendarTitle}>Select End Date</Text>
               <View style={styles.dateInputContainer}>
                 <TextInput
                   style={styles.dateInput}
                   placeholder="DD-MM-YYYY"
                   placeholderTextColor={Colors.textLight}
                   value={formData.endDateDisplay}
                   onChangeText={(text) => handleDateInput('endDate', text)}
                   keyboardType="numeric"
                   maxLength={10}
                 />
               </View>
               <TouchableOpacity
                 style={styles.confirmDateButton}
                 onPress={() => setShowEndDateModal(false)}
                 activeOpacity={0.7}
               >
                 <Text style={styles.confirmDateButtonText}>Confirm</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
       </Modal>
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
  keyboardView: {
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  minBudgetText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  submitSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: Colors.background,
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  minBudgetLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  selectedOption: {
    backgroundColor: '#f0f4ff',
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    padding: 20,
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
  },
  dateInputContainer: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    width: '100%',
  },
  dateInput: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  confirmDateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  confirmDateButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
}); 