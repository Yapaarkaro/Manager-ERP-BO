import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Building2, ChevronDown, Check } from 'lucide-react-native';

const COLORS = {
  primary: '#3F66AC',
  secondary: '#F5C754',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

const businessTypes = [
  'Manufacturer',
  'C&F',
  'Distributor',
  'Trader',
  'Wholesaler',
  'Retailer',
  'Others',
];

export default function BusinessDetailsScreen() {
  const { type, value, gstinData } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-fill data from GSTIN verification
  useEffect(() => {
    if (type === 'GSTIN' && gstinData) {
      try {
        const parsedData = JSON.parse(gstinData as string);
        if (parsedData) {
          // Auto-fill business name from trade name or legal name
          const businessNameFromGstin = parsedData.tradeNam || parsedData.lgnm || '';
          setBusinessName(businessNameFromGstin);
          
          // Auto-fill owner name from legal name
          const ownerNameFromGstin = parsedData.lgnm || '';
          setName(ownerNameFromGstin);
          
          // Set business type based on constitution of business
          const constitutionType = parsedData.ctb || '';
          let mappedBusinessType = '';
          
          // Map constitution types to our business types
          switch (constitutionType.toLowerCase()) {
            case 'proprietorship':
              mappedBusinessType = 'Retailer';
              break;
            case 'partnership':
            case 'llp':
              mappedBusinessType = 'Trader';
              break;
            case 'private limited company':
            case 'public limited company':
            case 'company':
              mappedBusinessType = 'Manufacturer';
              break;
            case 'trust':
            case 'society':
            case 'association of persons':
              mappedBusinessType = 'Others';
              setCustomBusinessType(constitutionType);
              break;
            default:
              mappedBusinessType = 'Others';
              setCustomBusinessType(constitutionType);
          }
          
          setBusinessType(mappedBusinessType);
        }
      } catch (error) {
        console.error('Error parsing GSTIN data:', error);
      }
    }
  }, [type, gstinData]);

  const isFormValid = () => {
    return (
      name.trim().length > 0 &&
      businessName.trim().length > 0 &&
      businessType.trim().length > 0 &&
      (businessType !== 'Others' || customBusinessType.trim().length > 0)
    );
  };

  const handleBusinessTypeSelect = (type: string) => {
    setBusinessType(type);
    if (type !== 'Others') {
      setCustomBusinessType('');
    }
    setShowBusinessTypeModal(false);
  };

  const handleComplete = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    setIsCompleting(true);
    
    // Navigate to address search/selection screen
    setTimeout(() => {
      router.push({
        pathname: '/auth/business-address',
        params: {
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType: businessType !== 'Others' ? businessType : customBusinessType,
          customBusinessType: businessType === 'Others' ? customBusinessType : '',
        }
      });
      setIsCompleting(false);
    }, 500);
  };

  const renderBusinessTypeModal = () => (
    <Modal
      visible={showBusinessTypeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowBusinessTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Business Type</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBusinessTypeModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.businessTypeList}>
            {businessTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.businessTypeItem,
                  businessType === type && styles.selectedBusinessTypeItem,
                ]}
                onPress={() => handleBusinessTypeSelect(type)}
              >
                <Text style={[
                  styles.businessTypeText,
                  businessType === type && styles.selectedBusinessTypeText,
                ]}>
                  {type}
                </Text>
                {businessType === type && (
                  <Check size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentPadding}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Building2 size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Business Details</Text>
        {type === 'GSTIN' && gstinData ? (
          <Text style={styles.subtitle}>
            We've pre-filled your details from GSTIN verification. Please review and update if needed.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Tell us about yourself and your business to complete your profile
          </Text>
        )}

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name *</Text>
            <View style={styles.inputContainer}>
              <User size={20} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.gray}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <View style={styles.inputContainer}>
              <Building2 size={20} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your business name"
                placeholderTextColor={COLORS.gray}
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {businessType === 'Others' ? 'Specify Business Type *' : 'Business Type *'}
            </Text>
            {businessType === 'Others' ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your specific business type"
                  placeholderTextColor={COLORS.gray}
                  value={customBusinessType}
                  onChangeText={setCustomBusinessType}
                  autoCapitalize="words"
                  onFocus={() => {
                    // Scroll to bottom when custom business type field is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              </View>
            ) : (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBusinessTypeModal(true)}
            >
              <Text style={[
                styles.selectButtonText,
                !businessType && styles.selectButtonPlaceholder,
              ]}>
                {businessType || 'Select business type'}
              </Text>
              <ChevronDown size={20} color={COLORS.gray} />
            </TouchableOpacity>
            )}
          </View>

        </View>

        <TouchableOpacity
          style={[
            styles.completeButton,
            isFormValid() ? styles.enabledButton : styles.disabledButton,
          ]}
          onPress={handleComplete}
          disabled={!isFormValid() || isCompleting}
        >
          <Text style={[
            styles.completeButtonText,
            isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
          ]}>
          {isCompleting ? 'Please wait...' : 'Continue'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {renderBusinessTypeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPadding: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    outlineStyle: 'none',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.black,
  },
  selectButtonPlaceholder: {
    color: COLORS.gray,
  },
  completeButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  enabledButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: COLORS.white,
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
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
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  businessTypeList: {
    paddingHorizontal: 20,
  },
  businessTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedBusinessTypeItem: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  businessTypeText: {
    fontSize: 16,
    color: COLORS.black,
  },
  selectedBusinessTypeText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});