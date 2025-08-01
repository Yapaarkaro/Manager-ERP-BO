import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Building2, 
  Search, 
  X, 
  ChevronDown, 
  CreditCard,
  IndianRupee,
  User,
  Hash
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { indianBanks, IndianBank, validateAccountNumber, validateIFSC, allBanksWithOthers } from '@/data/indianBanks';

export default function BankingDetailsScreen() {
  const { 
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    allAddresses,
    allBankAccounts = '[]',
    isAddingSecondary = 'false',
    editMode = 'false',
    editAccountId = '',
    prefilledBankId = '',
    prefilledAccountHolderName = '',
    prefilledAccountNumber = '',
    prefilledIFSC = '',
    prefilledAccountType = '',
    prefilledInitialBalance = '',
  } = useLocalSearchParams();

  const [selectedBank, setSelectedBank] = useState<IndianBank | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(prefilledAccountHolderName as string || (isAddingSecondary === 'false' ? businessName as string || '' : ''));
  const [accountNumber, setAccountNumber] = useState(prefilledAccountNumber as string || '');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(prefilledAccountNumber as string || '');
  const [ifscCode, setIfscCode] = useState(prefilledIFSC as string || '');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>(
    (prefilledAccountType as 'Savings' | 'Current') || 'Savings'
  );
  const [initialBalance, setInitialBalance] = useState(prefilledInitialBalance as string || '');
  const [ifscSelection, setIfscSelection] = useState<{start: number, end: number} | undefined>();
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const ifscInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  useEffect(() => {
    // Pre-fill bank if editing
    if (editMode === 'true' && prefilledBankId) {
      const bank = allBanksWithOthers.find(b => b.id === prefilledBankId);
      if (bank) {
        setSelectedBank(bank);
      }
    }
  }, [editMode, prefilledBankId]);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredBanks = allBanksWithOthers.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.ifscPrefix.toLowerCase().includes(bankSearch.toLowerCase())
  );

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
      !isNaN(parseFloat(initialBalance))
    );
  };

  const getValidationMessage = () => {
    if (!selectedBank) return 'Please select a bank';
    if (selectedBank.id === 'others' && !customBankName.trim()) return 'Please enter bank name';
    if (!accountHolderName.trim()) return 'Please enter account holder name';
    if (!accountNumber) return 'Please enter account number';
    if (accountNumber !== confirmAccountNumber) return 'Account numbers do not match';
    if (selectedBank && selectedBank.id !== 'others' && !validateAccountNumber(selectedBank.id, accountNumber)) {
      return `Account number should be ${selectedBank.accountNumberFormat}`;
    }
    if (ifscCode.length !== 11) return 'IFSC code should be 11 characters';
    if (!validateIFSC(ifscCode)) return 'Invalid IFSC code format';
    if (accountType !== 'Savings' && accountType !== 'Current') return 'Please select account type';
    if (!initialBalance || isNaN(parseFloat(initialBalance))) return 'Please enter valid initial balance';
    return '';
  };

  const handleContinue = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Details', getValidationMessage());
      return;
    }

    setIsLoading(true);

    // Parse existing bank accounts
    let existingBankAccounts = [];
    try {
      existingBankAccounts = JSON.parse(allBankAccounts as string);
    } catch (error) {
      console.log('No existing bank accounts');
    }

    const bankAccount = {
      id: editMode === 'true' && editAccountId ? editAccountId : `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bankId: selectedBank!.id,
      bankName: selectedBank!.id === 'others' ? customBankName.trim() : selectedBank!.name,
      bankShortName: selectedBank!.id === 'others' ? customBankName.trim() : selectedBank!.shortName,
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber,
      ifscCode: ifscCode,
      accountType: accountType,
      initialBalance: parseFloat(initialBalance),
      isPrimary: isAddingSecondary === 'false' && editMode === 'false',
      createdAt: new Date().toISOString(),
    };

    let allBankAccountsList;
    if (editMode === 'true') {
      // Edit existing account
      allBankAccountsList = existingBankAccounts.map((acc: any) => 
        acc.id === editAccountId ? bankAccount : acc
      );
    } else {
      // Add new account
      allBankAccountsList = [...existingBankAccounts, bankAccount];
    }

    setTimeout(() => {
      router.push({
        pathname: '/auth/bank-accounts',
        params: {
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          allAddresses,
          allBankAccounts: JSON.stringify(allBankAccountsList),
        }
      });
      setIsLoading(false);
    }, 500);
  };

  const getBankCategoryColor = (category: string) => {
    switch (category) {
      case 'public': return '#10b981';
      case 'private': return '#3b82f6';
      case 'foreign': return '#8b5cf6';
      case 'cooperative': return '#f59e0b';
      case 'regional': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getBankCategoryLabel = (category: string) => {
    switch (category) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      case 'foreign': return 'Foreign';
      case 'cooperative': return 'Cooperative';
      case 'regional': return 'Regional';
      default: return 'Other';
    }
  };

  const slideTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
    opacity: slideAnimation,
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <CreditCard size={48} color="#3f66ac" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  {isAddingSecondary === 'true' ? 'Add Bank Account' : 
                   editMode === 'true' ? 'Edit Bank Account' : 'Primary Bank Account'}
                </Text>
                <Text style={styles.subtitle}>
                  {isAddingSecondary === 'true' ? 'Add an additional bank account for your business' :
                   editMode === 'true' ? 'Edit your bank account details' :
                   'Add your primary business bank account for transactions and payments'}
                </Text>
                
                {isAddingSecondary === 'false' && editMode === 'false' && (
                <View style={styles.primaryNotice}>
                  <Text style={styles.primaryNoticeText}>
                    🏦 This is your <Text style={styles.primaryBold}>Primary Bank Account</Text>
                  </Text>
                  <Text style={styles.primaryNoticeSubtext}>
                    You can add more bank accounts later
                  </Text>
                </View>
                )}
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select Bank *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={handleBankModalOpen}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bankSelectContent}>
                      {selectedBank ? (
                        <View style={styles.selectedBankInfo}>
                          <Text style={styles.selectedBankName}>
                            {selectedBank.id === 'others' ? (customBankName || 'Others - Enter bank name') : selectedBank.name}
                          </Text>
                          <View style={styles.bankMetaInfo}>
                            {selectedBank.id !== 'others' && (
                              <>
                                <Text style={styles.bankShortName}>({selectedBank.shortName})</Text>
                                <View style={[
                                  styles.bankCategoryBadge,
                                  { backgroundColor: getBankCategoryColor(selectedBank.category) }
                                ]}>
                                  <Text style={styles.bankCategoryText}>
                                    {getBankCategoryLabel(selectedBank.category)}
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>Search and select your bank</Text>
                      )}
                    </View>
                    <ChevronDown size={20} color="#666666" />
                  </TouchableOpacity>
                  {selectedBank && selectedBank.id !== 'others' && (
                    <Text style={styles.fieldHint}>
                      Account number format: {selectedBank.accountNumberFormat}
                    </Text>
                  )}
                </View>

                {selectedBank && selectedBank.id === 'others' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Bank Name *</Text>
                    <View style={styles.inputContainer}>
                      <Building2 size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={customBankName}
                        onChangeText={setCustomBankName}
                        placeholder="Enter your bank name"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Holder Name *</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={accountHolderName}
                      onChangeText={setAccountHolderName}
                      placeholder="Enter account holder name"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Number *</Text>
                  <View style={styles.inputContainer}>
                    <Hash size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={accountNumber}
                      onChangeText={handleAccountNumberChange}
                      placeholder="Enter account number"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Account Number *</Text>
                  <View style={styles.inputContainer}>
                    <Hash size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={[
                        styles.input,
                        confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber && styles.errorInput
                      ]}
                      value={confirmAccountNumber}
                      onChangeText={handleConfirmAccountNumberChange}
                      placeholder="Re-enter account number"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                    />
                  </View>
                  {confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber && (
                    <Text style={styles.errorText}>Account numbers do not match</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>IFSC Code *</Text>
                  <View style={styles.inputContainer}>
                    <Building2 size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      ref={ifscInputRef}
                      style={styles.input}
                      value={ifscCode}
                      onChangeText={handleIFSCChange}
                      placeholder="Enter IFSC code"
                      placeholderTextColor="#999999"
                      autoCapitalize="characters"
                      maxLength={11}
                      selection={ifscSelection}
                      onSelectionChange={handleIFSCSelectionChange}
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    Format: 4 letters + 0 + 6 characters (e.g., SBIN0001234)
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Type *</Text>
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        accountType === 'Savings' && styles.activeToggleButton,
                      ]}
                      onPress={() => setAccountType('Savings')}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        accountType === 'Savings' && styles.activeToggleButtonText,
                      ]}>
                        Savings
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        accountType === 'Current' && styles.activeToggleButton,
                      ]}
                      onPress={() => setAccountType('Current')}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        accountType === 'Current' && styles.activeToggleButtonText,
                      ]}>
                        Current
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fieldHint}>
                    Select "Savings" for personal accounts or "Current" for business accounts
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Initial Balance *</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={[styles.input, styles.balanceInput]}
                      value={initialBalance}
                      onChangeText={handleInitialBalanceChange}
                      placeholder="0.00"
                      placeholderTextColor="#999999"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    Enter the current balance in this account
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  isFormValid() ? styles.enabledButton : styles.disabledButton,
                ]}
                onPress={handleContinue}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.continueButtonText,
                  isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Saving Bank Account...' : 
                   editMode === 'true' ? 'Save Changes' : 'Continue'}
                </Text>
              </TouchableOpacity>

              {!isFormValid() && (
                <Text style={styles.validationMessage}>
                  {getValidationMessage()}
                </Text>
              )}
            </Animated.View>
          </ScrollView>

          {/* Bank Selection Modal */}
          <Modal
            visible={showBankModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowBankModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Bank</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowBankModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#666666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Search size={18} color="#64748b" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    placeholder="Search banks..."
                    placeholderTextColor="#94a3b8"
                    autoFocus={false}
                  />
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {filteredBanks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.modalOption,
                        selectedBank?.id === bank.id && styles.modalOptionSelected
                      ]}
                      onPress={() => handleBankSelect(bank)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.bankInfo}>
                        <Text style={[
                          styles.bankName,
                          selectedBank?.id === bank.id && styles.bankNameSelected
                        ]}>
                          {bank.name}
                        </Text>
                        <View style={styles.bankMeta}>
                          <Text style={styles.bankShortNameModal}>({bank.shortName})</Text>
                          <Text style={styles.bankIFSC}>IFSC: {bank.ifscPrefix}****</Text>
                        </View>
                      </View>
                      <View style={[
                        styles.bankCategoryBadge,
                        { backgroundColor: getBankCategoryColor(bank.category) }
                      ]}>
                        <Text style={styles.bankCategoryText}>
                          {getBankCategoryLabel(bank.category)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#ffc754',
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  primaryNotice: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0369a1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryNoticeText: {
    fontSize: 16,
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBold: {
    fontWeight: '700',
  },
  primaryNoticeSubtext: {
    fontSize: 14,
    color: '#0284c7',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    outlineStyle: 'none',
  },
  errorInput: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  accountTypeInput: {
    textTransform: 'capitalize',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#3f66ac',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  activeToggleButtonText: {
    color: '#ffffff',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 12,
  },
  balanceInput: {
    textAlign: 'right',
  },
  dropdown: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankSelectContent: {
    flex: 1,
  },
  selectedBankInfo: {
    flex: 1,
  },
  selectedBankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bankMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankShortName: {
    fontSize: 12,
    color: '#666666',
  },
  bankCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bankCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999999',
  },
  continueButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  enabledButton: {
    backgroundColor: '#ffc754',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#3f66ac',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  validationMessage: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#334155',
    paddingVertical: 8,
    outlineStyle: 'none',
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
  },
  bankNameSelected: {
    color: '#3f66ac',
    fontWeight: '600',
  },
  bankMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankShortNameModal: {
    fontSize: 12,
    color: '#64748b',
  },
  bankIFSC: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
});