import React, { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft,
  Search,
  Check,
  Edit3,
  ChevronDown,
  X,
  CreditCard,
  IndianRupee,
  User,
  Hash,
  Building2,
} from 'lucide-react-native';
import { dataStore, BankAccount } from '@/utils/dataStore';
import { indianBanks, IndianBank, validateAccountNumber, validateIFSC, allBanksWithOthers } from '@/data/indianBanks';

const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  grey: {
    50: '#F9F9F9',
    100: '#F2F2F7',
    200: '#E5E5EA',
    300: '#D1D1D6',
    400: '#C7C7CC',
    500: '#AEAEB2',
    600: '#8E8E93',
    700: '#636366',
    800: '#48484A',
    900: '#1C1C1E',
  },
};

export default function AddBankAccount() {
  const params = useLocalSearchParams();
  const isEditMode = params.account ? true : false;
  const existingAccount = params.account ? JSON.parse(params.account as string) : null;

  const [selectedBank, setSelectedBank] = useState<IndianBank | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [initialBalance, setInitialBalance] = useState('');
  const [upiId, setUpiId] = useState('');
  const [ifscSelection, setIfscSelection] = useState<{start: number, end: number} | undefined>();
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const ifscInputRef = useRef<TextInput>(null);

  // Initialize form values when editing
  useEffect(() => {
    if (isEditMode && existingAccount) {
      setAccountHolderName(existingAccount.accountHolderName || '');
      setAccountNumber(existingAccount.accountNumber || '');
      setConfirmAccountNumber(existingAccount.accountNumber || '');
      setIfscCode(existingAccount.ifscCode || '');
      setUpiId(existingAccount.upiId || '');
      setAccountType(existingAccount.accountType === 'savings' ? 'Savings' : 'Current');
      setIsPrimary(existingAccount.isPrimary || false);
      
      // Find and set the bank
      const bank = allBanksWithOthers.find(b => b.id === existingAccount.bankCode || b.shortName === existingAccount.bankCode);
      if (bank) {
        setSelectedBank(bank);
        if (bank.id === 'others') {
          setCustomBankName(existingAccount.bankName);
        }
      }
    }

    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [isEditMode, existingAccount]);

  const filteredBanks = allBanksWithOthers.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.ifscPrefix.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const accountTypes = [
    { value: 'Savings', label: 'Savings Account' },
    { value: 'Current', label: 'Current Account' },
  ];

  const handleBankSelect = (bank: IndianBank) => {
    setSelectedBank(bank);
    setBankSearch('');
    setShowBankModal(false);
    
    // Auto-fill IFSC prefix only for preset banks (not Others)
    if (bank.id !== 'others') {
      if (ifscCode.length === 0 || !ifscCode.startsWith(bank.ifscPrefix)) {
        setIfscCode(bank.ifscPrefix + '0');
        // Set cursor position after the prefix
        setTimeout(() => {
          if (ifscInputRef.current) {
            const cursorPosition = bank.ifscPrefix.length + 1;
            setIfscSelection({ start: cursorPosition, end: cursorPosition });
            ifscInputRef.current.focus();
          }
        }, 100);
      }
    } else {
      // Clear IFSC for Others option
      setIfscCode('');
      setCustomBankName('');
    }
  };

  const handleBankModalOpen = () => {
    setShowBankModal(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  };

  const handleIFSCChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setIfscCode(cleaned);
    
    // Set cursor position after bank prefix when bank is selected (not Others)
    if (selectedBank && selectedBank.id !== 'others' && cleaned.startsWith(selectedBank.ifscPrefix) && cleaned.length === selectedBank.ifscPrefix.length + 1) {
      setTimeout(() => {
        setIfscSelection({ start: cleaned.length, end: cleaned.length });
      }, 0);
    }
    
    // Auto-detect bank from IFSC (only for preset banks)
    if (cleaned.length >= 4 && (!selectedBank || selectedBank.id === 'others')) {
      const prefix = cleaned.substring(0, 4);
      const matchingBank = indianBanks.find(bank => bank.ifscPrefix === prefix);
      if (matchingBank) {
        setSelectedBank(matchingBank);
      }
    }
  };

  const handleIFSCSelectionChange = (event: any) => {
    setIfscSelection(event.nativeEvent.selection);
  };

  const handleAccountNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setAccountNumber(cleaned);
  };

  const handleConfirmAccountNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setConfirmAccountNumber(cleaned);
  };

  const handleInitialBalanceChange = (text: string) => {
    // Allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    setInitialBalance(cleaned);
  };

  const validateUPI = (upi: string): boolean => {
    // UPI ID format: username@bankname or username@upi
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    return upiRegex.test(upi) && upi.length >= 5 && upi.length <= 50;
  };

  const handleUPIChange = (text: string) => {
    // Convert to lowercase and remove spaces
    const cleaned = text.toLowerCase().replace(/\s/g, '');
    setUpiId(cleaned);
  };

  const isFormValid = () => {
    return (
      selectedBank !== null &&
      (selectedBank.id !== 'others' || customBankName.trim().length > 0) &&
      accountHolderName.trim().length > 0 &&
      accountNumber.length > 0 &&
      accountNumber === confirmAccountNumber &&
      (selectedBank.id === 'others' || validateAccountNumber(selectedBank?.id || '', accountNumber)) &&
      ifscCode.length === 11 &&
      validateIFSC(ifscCode) &&
      (accountType === 'Savings' || accountType === 'Current') &&
      initialBalance.length > 0 &&
      !isNaN(parseFloat(initialBalance)) &&
      parseFloat(initialBalance) >= 0 &&
      validateUPI(upiId)
    );
  };

  const handleConfirmBankAccount = () => {
    if (!isFormValid()) {
      Alert.alert('Missing Information', 'Please fill in all required fields correctly.');
      return;
    }

    // Check for duplicate UPI IDs
    const allBankAccounts = dataStore.getBankAccounts();
    const isDuplicateUpi = allBankAccounts.some(account => 
      account.upiId.toLowerCase() === upiId.toLowerCase() &&
      (!isEditMode || account.id !== existingAccount?.id)
    );

    if (isDuplicateUpi) {
      Alert.alert('Duplicate UPI ID', 'A bank account with this UPI ID already exists. Please use a different UPI ID.');
      return;
    }

    if (isEditMode && existingAccount) {
      // Update existing bank account
      dataStore.updateBankAccount(existingAccount.id, {
        accountHolderName: accountHolderName.trim(),
        bankName: selectedBank?.id === 'others' ? customBankName : selectedBank?.name || '',
        bankCode: selectedBank?.shortName || '',
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        upiId: upiId.trim(),
        accountType: accountType.toLowerCase() as 'savings' | 'current',
        isPrimary,
        updatedAt: new Date().toISOString(),
      });
      
      // If setting as primary, update the dataStore
      if (isPrimary) {
        dataStore.setPrimaryBankAccount(existingAccount.id);
      }
      
      Alert.alert('Success', 'Bank account updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      // Add new bank account
      const newBankAccount: BankAccount = {
        id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountHolderName: accountHolderName.trim(),
        bankName: selectedBank?.id === 'others' ? customBankName : selectedBank?.name || '',
        bankCode: selectedBank?.shortName || '',
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        upiId: upiId.trim(),
        accountType: accountType.toLowerCase() as 'savings' | 'current',
        isPrimary,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      dataStore.addBankAccount(newBankAccount);
      
      // If setting as primary, update the dataStore
      if (isPrimary) {
        dataStore.setPrimaryBankAccount(newBankAccount.id);
      }
      
      Alert.alert('Success', 'Bank account added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Bank Account' : 'Add Bank Account'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Account Holder Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Holder Information</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the name of the person or business that holds this account
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Holder Name *</Text>
              <TextInput
                style={[styles.input, { borderColor: accountHolderName ? Colors.success : Colors.border }]}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                placeholder="Enter account holder's full name"
                placeholderTextColor={Colors.textSecondary}
                editable={true}
              />
            </View>
          </View>

          {/* Bank Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Selection</Text>
            <Text style={styles.sectionSubtitle}>
              Select your bank from the list below
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Bank *</Text>
              <TouchableOpacity
                style={styles.bankSelector}
                onPress={handleBankModalOpen}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.bankSelectorText,
                  selectedBank ? styles.bankSelectorText : styles.bankSelectorPlaceholder
                ]}>
                  {selectedBank ? selectedBank.name : 'Select Bank'}
                </Text>
                <ChevronDown size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Custom Bank Name (only shown when "Others" is selected) */}
            {selectedBank?.id === 'others' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bank Name *</Text>
                <TextInput
                  style={[styles.input, { borderColor: customBankName ? Colors.success : Colors.border }]}
                  value={customBankName}
                  onChangeText={setCustomBankName}
                  placeholder="Enter bank name"
                  placeholderTextColor={Colors.textSecondary}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Please enter the complete name of your bank
                </Text>
              </View>
            )}
          </View>

          {/* Account Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <Text style={styles.sectionSubtitle}>
              Enter your account information
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number *</Text>
              <TextInput
                style={[styles.input, { borderColor: accountNumber ? Colors.success : Colors.border }]}
                value={accountNumber}
                onChangeText={handleAccountNumberChange}
                placeholder="Enter account number"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                editable={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Account Number *</Text>
              <TextInput
                style={[styles.input, { borderColor: confirmAccountNumber ? Colors.success : Colors.border }]}
                value={confirmAccountNumber}
                onChangeText={handleConfirmAccountNumberChange}
                placeholder="Confirm account number"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                editable={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IFSC Code *</Text>
              <TextInput
                style={[styles.input, { borderColor: ifscCode ? Colors.success : Colors.border }]}
                value={ifscCode}
                onChangeText={handleIFSCChange}
                onSelectionChange={handleIFSCSelectionChange}
                selection={ifscSelection}
                placeholder="Enter IFSC code"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
                editable={true}
              />
              <Text style={styles.fieldHint}>
                IFSC code will be auto-filled based on bank selection
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type *</Text>
              <TouchableOpacity
                style={styles.accountTypeSelector}
                onPress={() => setShowAccountTypeModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.accountTypeSelectorText,
                  accountType ? styles.accountTypeSelectorText : styles.accountTypeSelectorPlaceholder
                ]}>
                  {accountTypes.find(type => type.value === accountType)?.label || 'Select Account Type'}
                </Text>
                <ChevronDown size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* UPI ID */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UPI ID</Text>
            <Text style={styles.sectionSubtitle}>
              Enter your UPI ID for digital payments
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>UPI ID *</Text>
              <TextInput
                style={[styles.input, { borderColor: upiId ? Colors.success : Colors.border }]}
                value={upiId}
                onChangeText={handleUPIChange}
                placeholder="username@bank (e.g., john.doe@hdfc)"
                placeholderTextColor={Colors.textSecondary}
                editable={true}
              />
              <Text style={styles.fieldHint}>
                Format: username@bank (e.g., john.doe@hdfc, business@icici)
              </Text>
            </View>
          </View>

          {/* Initial Balance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Initial Balance</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the initial balance for this account
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Balance *</Text>
              <TextInput
                style={[styles.input, { borderColor: initialBalance ? Colors.success : Colors.border }]}
                value={initialBalance}
                onChangeText={handleInitialBalanceChange}
                placeholder="Enter initial balance"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                editable={true}
              />
              <Text style={styles.fieldHint}>
                This will be the starting balance for this account.
              </Text>
            </View>
          </View>

          {/* Set as Primary Option */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.primaryToggle}
                onPress={() => setIsPrimary(!isPrimary)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, { backgroundColor: isPrimary ? Colors.primary : Colors.grey[200] }]}>
                  {isPrimary && <Check size={16} color={Colors.card} />}
                </View>
                <View style={styles.primaryToggleText}>
                  <Text style={styles.primaryToggleLabel}>Set as Primary Bank Account</Text>
                  <Text style={styles.primaryToggleHint}>
                    This will be your main bank account for transactions
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmBankAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              {isEditMode ? 'Update Bank Account' : 'Add Bank Account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bankModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity
                onPress={() => setShowBankModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search banks..."
                value={bankSearch}
                onChangeText={setBankSearch}
                placeholderTextColor={Colors.textSecondary}
                ref={searchInputRef}
              />
            </View>
            
            <ScrollView style={styles.bankList} showsVerticalScrollIndicator={false}>
              {filteredBanks.map((bank) => (
                <TouchableOpacity
                  key={bank.id}
                  style={styles.bankOption}
                  onPress={() => handleBankSelect(bank)}
                >
                  <Text style={styles.bankOptionText}>{bank.name}</Text>
                  {selectedBank?.id === bank.id && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Type Selection Modal */}
      <Modal
        visible={showAccountTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountTypeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Account Type</Text>
              <TouchableOpacity
                onPress={() => setShowAccountTypeModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.accountTypeList}>
              {accountTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.accountTypeOption}
                  onPress={() => {
                    setAccountType(type.value as 'Savings' | 'Current');
                    setShowAccountTypeModal(false);
                  }}
                >
                  <Text style={styles.accountTypeOptionText}>{type.label}</Text>
                  {accountType === type.value && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  bankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  bankSelectorText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  bankSelectorPlaceholder: {
    color: Colors.textSecondary,
  },
  accountTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  accountTypeSelectorText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  accountTypeSelectorPlaceholder: {
    color: Colors.textSecondary,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: Colors.card,
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankModal: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  accountTypeModal: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '90%',
    maxHeight: '50%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  bankList: {
    maxHeight: 300,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  accountTypeList: {
    padding: 16,
  },
  accountTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accountTypeOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryToggleText: {
    flex: 1,
  },
  primaryToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  primaryToggleHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
