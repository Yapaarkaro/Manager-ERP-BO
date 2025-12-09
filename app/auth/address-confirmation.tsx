import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MapPin, Building2, Warehouse, Plus, Edit3, Trash2, Check, ArrowRight, Home, ChevronDown, ChevronUp, User, Phone, Star, ArrowLeft } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore } from '@/utils/dataStore';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { deleteAddress, updateAddress, saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';

interface Address {
  id: string;
  backendId?: string; // Backend ID for API operations
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  stateName: string;
  stateCode: string;
  manager?: string;
  phone?: string;
  isPrimary: boolean;
}

type AddressSection = 'primary' | 'branch' | 'warehouse';

export default function AddressConfirmationScreen() {
  const { 
    type: taxIdType,
    value: taxIdValue,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    mobile,
    allAddresses = '[]',
    addressType,
    // Invoice configuration (for returning users from business summary)
    initialCashBalance,
    invoicePrefix,
    invoicePattern,
    startingInvoiceNumber,
    fiscalYear,
  } = useLocalSearchParams();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<AddressSection>>(new Set(['primary']));
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();
  const debouncedNavigate = useDebounceNavigation(500);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false, // Disable for web to avoid warning
    }).start();
  }, []);

  // Reload addresses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Address Confirmation screen focused - reloading addresses');
      console.log('🔍 Address Confirmation - TAX ID Type parameter:', taxIdType);
      console.log('🔍 Address Confirmation - TAX ID Value parameter:', taxIdValue);
      console.log('🔍 Address Confirmation - AddressType parameter:', addressType);
      console.log('🔍 Address Confirmation - All params:', { taxIdType, taxIdValue, addressType, name, businessName });
      
      // Load addresses from dataStore first, then fallback to parameter
      const dataStoreAddresses = dataStore.getAddresses();
      
      // Try to parse addresses from parameters
      let paramAddresses: Address[] = [];
      try {
        paramAddresses = JSON.parse(allAddresses as string);
      } catch (error) {
        // No addresses to parse from parameters or parse error
      }
      
      if (dataStoreAddresses.length > 0) {
        // Merge dataStore addresses with parameter addresses to ensure we have the latest info
        const mergedAddresses = dataStoreAddresses.map(dataStoreAddr => {
          const paramAddr = paramAddresses.find(addr => addr.id === dataStoreAddr.id);
          if (paramAddr) {
            // Use parameter address if it exists (it might have more recent data like mobile number)
            return paramAddr;
          }
          return dataStoreAddr;
        });
        setAddresses(mergedAddresses);
      } else if (paramAddresses.length > 0) {
        // Fallback to parsing addresses from the previous screen
        setAddresses(paramAddresses);
      } else {
        setAddresses([]);
      }
    }, [taxIdType, taxIdValue, addressType, allAddresses])
  );

  const getAddressTypeInfo = (type: Address['type']) => {
    switch (type) {
      case 'primary':
        return {
          icon: Home,
          color: '#3f66ac',
          bgColor: '#f0f4ff',
          label: 'Primary Business',
          description: 'Main business location',
          sectionTitle: 'Primary Business Address'
        };
      case 'branch':
        return {
          icon: Building2,
          color: '#10b981',
          bgColor: '#f0fdf4',
          label: 'Business Branch',
          description: 'Additional business location',
          sectionTitle: 'Branch Offices'
        };
      case 'warehouse':
        return {
          icon: Warehouse,
          color: '#f59e0b',
          bgColor: '#fffbeb',
          label: 'Warehouse',
          description: 'Storage and inventory location',
          sectionTitle: 'Warehouses'
        };
    }
  };

  const formatAddress = (address: Address) => {
    const parts = [
      address.doorNumber,
      address.addressLine1,
      address.addressLine2,
      address.city,
      `${address.stateName} - ${address.pincode}`
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  const toggleSection = (section: AddressSection) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // ✅ Memoize filtered addresses to prevent excessive re-renders and logging
  const getAddressesByType = React.useMemo(() => {
    const cache: Record<AddressSection, typeof addresses> = {
      primary: [],
      branch: [],
      warehouse: [],
    };
    
    // Pre-compute filtered addresses once
    addresses.forEach(addr => {
      if (addr.type === 'primary') cache.primary.push(addr);
      else if (addr.type === 'branch') cache.branch.push(addr);
      else if (addr.type === 'warehouse') cache.warehouse.push(addr);
    });
    
    return (type: AddressSection) => {
      const filtered = cache[type] || [];
      // Only log occasionally in development to reduce noise
      if (__DEV__ && Math.random() < 0.05) { // Log only 5% of calls
        console.log(`📋 Filtering addresses for type "${type}":`, filtered.length);
      }
      return filtered;
    };
  }, [addresses]);

  const getAddressCount = (type: AddressSection) => {
    return getAddressesByType(type).length;
  };

  const handleAddAddress = (addressTypeParam: 'branch' | 'warehouse') => {
    setShowAddOptions(false);
    console.log('🏢 Adding new address of type:', addressTypeParam);
    console.log('📋 Current addresses before adding:', addresses);
    
    router.push({
      pathname: '/auth/business-address',
      params: {
        type: taxIdType, // TAX ID type (GSTIN/PAN)
        value: taxIdValue,
        gstinData: gstinData,
        name: name,
        businessName: businessName,
        businessType: businessType,
        customBusinessType: customBusinessType,
        mobile: mobile,
        addressType: addressTypeParam, // Address type (branch/warehouse)
        existingAddresses: JSON.stringify(addresses),
      }
    });
  };

  const handleEditAddress = (address: Address) => {
    router.push({
      pathname: '/edit-address-simple',
      params: {
        editAddressId: address.id,
        addressType: address.type,
        // Signup flow parameters
        type: taxIdType,
        value: taxIdValue,
        gstinData: gstinData,
        name: name,
        businessName: businessName,
        businessType: businessType,
        customBusinessType: customBusinessType,
        existingAddresses: JSON.stringify(addresses),
      }
    });
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (addressToDelete) {
      try {
        const address = addresses.find(addr => addr.id === addressToDelete);
        
        // Delete from backend if backendId exists
        if (address?.backendId) {
          const result = await deleteAddress(address.backendId);
          if (!result.success) {
            console.warn('⚠️ Backend delete failed, continuing with local delete:', result.error);
          } else {
            console.log('✅ Address deleted from backend');
          }
        }
        
        // Update local state
        setAddresses(prev => prev.filter(addr => addr.id !== addressToDelete));
        
        // Update dataStore
        dataStore.deleteAddress(addressToDelete);
        
        setAddressToDelete(null);
        setShowDeleteModal(false);
      } catch (error: any) {
        console.error('Error deleting address:', error);
        Alert.alert('Error', error.message || 'Failed to delete address. Please try again.');
      }
    }
  };

  const handleMakePrimary = async (addressId: string) => {
    try {
      const address = addresses.find(addr => addr.id === addressId);
      
      // Update in backend if backendId exists (non-blocking)
      if (address?.backendId) {
        updateAddress({
          addressId: address.backendId,
          isPrimary: true,
        }).then((result) => {
          if (!result.success) {
            console.warn('⚠️ Backend update failed, continuing with local update:', result.error);
          } else {
            console.log('✅ Address set as primary in backend');
          }
        }).catch((error) => {
          console.error('Error updating address in backend:', error);
        });
      }
      
      setAddresses(prev => {
        const currentPrimaryIndex = prev.findIndex(addr => addr.isPrimary);
      const newPrimaryIndex = prev.findIndex(addr => addr.id === addressId);
      
      if (currentPrimaryIndex === -1 || newPrimaryIndex === -1) return prev;
      
      const currentPrimary = prev[currentPrimaryIndex];
      const newPrimary = prev[newPrimaryIndex];
      
      console.log('🔄 KEEPING ADDRESS DATA, ONLY CHANGING TYPE');
      console.log('📍 Current primary BEFORE:', { 
        id: currentPrimary.id, 
        type: currentPrimary.type, 
        name: currentPrimary.name, 
        city: currentPrimary.city,
        manager: currentPrimary.manager,
        phone: currentPrimary.phone
      });
      console.log('⭐ New primary (branch/warehouse) BEFORE:', { 
        id: newPrimary.id, 
        type: newPrimary.type, 
        name: newPrimary.name, 
        city: newPrimary.city,
        manager: newPrimary.manager,
        phone: newPrimary.phone
      });
      
      // Keep each address's own data, only change type and isPrimary
      const swappedOldPrimary: Address = {
        ...currentPrimary, // Keep ALL the primary's address data (including undefined manager/phone)
        isPrimary: false,
        type: newPrimary.type as 'primary' | 'branch' | 'warehouse', // ✅ Type assertion
      };
      
      const swappedNewPrimary: Address = {
        ...newPrimary, // Keep ALL the branch/warehouse's address data (including manager/phone)
        isPrimary: true,
        type: 'primary', // ✅ Already correct type
      };
      
      console.log('✏️ Old primary will become:', { 
        id: swappedOldPrimary.id,
        type: swappedOldPrimary.type, 
        name: swappedOldPrimary.name,
        city: swappedOldPrimary.city,
        manager: swappedOldPrimary.manager,
        phone: swappedOldPrimary.phone
      });
      console.log('✏️ New primary will become:', { 
        id: swappedNewPrimary.id,
        type: swappedNewPrimary.type, 
        name: swappedNewPrimary.name,
        city: swappedNewPrimary.city,
        manager: swappedNewPrimary.manager,
        phone: swappedNewPrimary.phone
      });
      
      // Create new array with swapped addresses at their original positions
      const updatedAddresses = [...prev];
      updatedAddresses[currentPrimaryIndex] = swappedOldPrimary;
      updatedAddresses[newPrimaryIndex] = swappedNewPrimary;
      
      // Update in dataStore
      dataStore.updateAddress(currentPrimary.id, swappedOldPrimary);
      dataStore.updateAddress(newPrimary.id, swappedNewPrimary);
      
      // Log the complete address swap
      dataStore.logChange(
        'address_primary_change',
        `⭐ COMPLETE ADDRESS SWAP via star icon: ${currentPrimary.name} (${currentPrimary.city}) ↔ ${newPrimary.name} (${newPrimary.city})`,
        {
          id: currentPrimary.id,
          type: currentPrimary.type,
          name: currentPrimary.name,
          city: currentPrimary.city,
          isPrimary: true,
          manager: currentPrimary.manager,
          phone: currentPrimary.phone
        },
        {
          id: newPrimary.id,
          type: 'primary',
          name: newPrimary.name,
          city: newPrimary.city,
          isPrimary: true,
          manager: newPrimary.manager,
          phone: newPrimary.phone
        },
        { 
          action: 'star_icon_click',
          completeAddressSwap: true,
          swappedAllFields: true,
          oldPrimaryNewType: newPrimary.type,
          addressesExchanged: true
        }
      );
      
      console.log('✅ COMPLETE ADDRESS SWAP finished - all data swapped');
      console.log('📊 Final addresses state:', updatedAddresses.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        isPrimary: a.isPrimary,
        city: a.city,
        manager: a.manager,
        phone: a.phone
      })));
      
      // Log the complete new primary address details
      console.log('');
      console.log('='.repeat(60));
      console.log('⭐ NEW PRIMARY ADDRESS - COMPLETE DETAILS');
      console.log('='.repeat(60));
      console.log('Name:', swappedNewPrimary.name);
      console.log('Door/Flat:', swappedNewPrimary.doorNumber || 'N/A');
      console.log('Address Line 1:', swappedNewPrimary.addressLine1);
      console.log('Address Line 2:', swappedNewPrimary.addressLine2 || 'N/A');
      console.log('City:', swappedNewPrimary.city);
      console.log('State:', `${swappedNewPrimary.stateName} (${swappedNewPrimary.stateCode})`);
      console.log('Pincode:', swappedNewPrimary.pincode);
      console.log('Contact Person:', swappedNewPrimary.manager || 'User (from params)');
      console.log('Contact Phone:', swappedNewPrimary.phone || 'User mobile (from params)');
      console.log('Type:', swappedNewPrimary.type);
      console.log('Is Primary:', swappedNewPrimary.isPrimary);
      console.log('='.repeat(60));
      console.log('');
      
      return updatedAddresses;
    });
    } catch (error: any) {
      console.error('Error setting primary address:', error);
      Alert.alert('Error', error.message || 'Failed to set primary address. Please try again.');
    }
  };

  const handleContinue = async () => {
    // Prevent double navigation
    if (isNavigating) {
      console.log('⚠️ Navigation already in progress, ignoring duplicate click');
      return;
    }

    if (addresses.length === 0) {
      Alert.alert('No Address', 'Please add at least one business address to continue');
      return;
    }

    setIsNavigating(true);

    // ✅ Save signup progress to backend (address step complete, moving to banking)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get mobile from params or from user's phone metadata
        const mobileNumber = (mobile as string) || session?.user?.phone || session?.user?.user_metadata?.phone;
        if (mobileNumber) {
          const progressResult = await saveSignupProgress({
            mobile: mobileNumber,
            mobileVerified: true,
            taxIdType: taxIdType as 'GSTIN' | 'PAN',
            taxIdValue: taxIdValue as string,
            taxIdVerified: true,
            ownerName: name as string,
            businessName: businessName as string,
            businessType: businessType as string,
            gstinData: gstinData ? (typeof gstinData === 'string' ? JSON.parse(gstinData) : gstinData) : undefined,
            currentStep: 'addressManagement',
          });
          if (progressResult.success) {
            console.log('✅ Signup progress saved: addressManagement');
          } else {
            console.error('❌ Failed to save signup progress:', progressResult.error);
          }
        } else {
          console.warn('⚠️ Mobile number not available for saving signup progress');
        }
      }
    } catch (error) {
      console.error('Error saving signup progress:', error);
      // Continue even if progress save fails
    }

    // Check if user already has bank accounts (returning from business summary)
    const existingBankAccounts = dataStore.getBankAccounts();
    const hasExistingBanks = existingBankAccounts && existingBankAccounts.length > 0;

    // Get latest data from dataStore to ensure we have all updates
    const latestAddresses = dataStore.getAddresses();

    if (hasExistingBanks) {
      // Returning user with existing banks - go directly to bank account management
      console.log('🔄 User has existing bank accounts, navigating to bank account management');
      debouncedNavigate({
        pathname: '/auth/bank-accounts',
        params: {
          type: taxIdType,
          value: taxIdValue,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          mobile,
          allAddresses: JSON.stringify(latestAddresses),
          allBankAccounts: JSON.stringify(existingBankAccounts),
          // Pass invoice configuration for returning users
          initialCashBalance,
          invoicePrefix,
          invoicePattern,
          startingInvoiceNumber,
          fiscalYear,
        }
      }, 'replace');
    } else {
      // Fresh signup - go to banking details to add primary bank account
      console.log('📝 Fresh signup, navigating to banking details');
      debouncedNavigate({
        pathname: '/auth/banking-details',
        params: {
          type: taxIdType,
          value: taxIdValue,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          mobile,
          allAddresses: JSON.stringify(latestAddresses),
        }
      }, 'replace');
    }
    
    // Reset navigation flag after a delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };

  const renderAddressCard = (address: Address) => {
    const typeInfo = getAddressTypeInfo(address.type);
    const IconComponent = typeInfo.icon;
    
    console.log(`🎨 Rendering address card:`, {
      id: address.id,
      name: address.name,
      type: address.type,
      isPrimary: address.isPrimary,
      city: address.city,
      manager: address.manager,
      phone: address.phone
    });

    return (
      <View key={`${address.id}-${address.isPrimary}-${address.name}-${address.city}`} style={[styles.addressCard, { backgroundColor: typeInfo.bgColor }]}>
        <View style={styles.addressHeader}>
          <View style={styles.addressTypeContainer}>
            <View style={[styles.addressTypeIcon, { backgroundColor: typeInfo.color }]}>
              <IconComponent size={20} color="#ffffff" />
            </View>
            <View style={styles.addressTypeText}>
              <Text style={[styles.addressTypeLabel, { color: typeInfo.color }]}>
                {typeInfo.label}
              </Text>
              <Text style={styles.addressTypeBadge}>
                {address.isPrimary ? 'PRIMARY' : 'ADDITIONAL'}
              </Text>
            </View>
          </View>
          
          <View style={styles.addressActions}>
            {!address.isPrimary && (
              <TouchableOpacity
                style={[styles.actionButton, styles.starButton]}
                onPress={() => handleMakePrimary(address.id)}
                activeOpacity={0.7}
              >
                <Star size={16} color="#fbbf24" fill="none" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditAddress(address)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color="#64748b" />
            </TouchableOpacity>
            {!address.isPrimary && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteAddress(address.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.addressContent}>
          <Text style={styles.addressName}>{address.name}</Text>
          <Text style={styles.addressText}>{formatAddress(address)}</Text>
          
          {address.stateCode && (
            <View style={styles.stateCodeContainer}>
              <Text style={styles.stateCodeLabel}>
                State Name: {address.stateName} Code: {address.stateCode}
              </Text>
            </View>
          )}
          
          {/* Contact Person Information */}
          {(address.isPrimary ? (address.manager || address.phone || name || mobile) : (address.manager || address.phone || name || mobile)) && (
            <View style={styles.contactContainer}>
              <View style={styles.contactItem}>
                {address.isPrimary ? (
                  <>
                    {/* If primary has manager/phone (from swap), show them. Otherwise show user name/mobile */}
                    {(address.manager || name) && (
                      <>
                        <User size={14} color={typeInfo.color} />
                        <Text style={[styles.contactText, { color: typeInfo.color }]}>
                          {address.manager || name}
                        </Text>
                      </>
                    )}
                    {(address.phone || mobile) && (
                      <>
                        <Phone size={14} color={typeInfo.color} />
                        <Text style={[styles.contactText, { color: typeInfo.color }]}>
                          {address.phone || mobile}
                        </Text>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* For non-primary, show address contact if exists, otherwise show user contact as fallback */}
                    {(address.manager || name) && (
                      <>
                        <User size={14} color={typeInfo.color} />
                        <Text style={[styles.contactText, { color: typeInfo.color }]}>
                          {address.manager || name}
                        </Text>
                      </>
                    )}
                    {(address.phone || mobile) && (
                      <>
                        <Phone size={14} color={typeInfo.color} />
                        <Text style={[styles.contactText, { color: typeInfo.color }]}>
                          {address.phone || mobile}
                        </Text>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderAddressSection = (sectionType: AddressSection) => {
    const typeInfo = getAddressTypeInfo(sectionType);
    const sectionAddresses = getAddressesByType(sectionType);
    const isExpanded = expandedSections.has(sectionType);
    const addressCount = getAddressCount(sectionType);
    const IconComponent = typeInfo.icon;

    return (
      <View key={sectionType} style={styles.addressSection}>
        {/* Section Header */}
        <TouchableOpacity
          style={[styles.sectionHeader, { borderColor: typeInfo.color }]}
          onPress={() => toggleSection(sectionType)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: typeInfo.color }]}>
              <IconComponent size={24} color="#ffffff" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: typeInfo.color }]}>
                {typeInfo.sectionTitle}
              </Text>
              <Text style={styles.sectionCount}>
                {addressCount} {addressCount === 1 ? 'address' : 'addresses'}
              </Text>
            </View>
          </View>
          
          <View style={styles.sectionHeaderRight}>
            {addressCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: typeInfo.color }]}>
                <Text style={styles.countBadgeText}>{addressCount}</Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={typeInfo.color} />
            ) : (
              <ChevronDown size={20} color={typeInfo.color} />
            )}
          </View>
        </TouchableOpacity>

        {/* Section Content */}
        {isExpanded && (
          <View style={styles.sectionContent}>
            {sectionAddresses.length > 0 ? (
              <>
                {sectionAddresses.map(renderAddressCard)}
                
                {/* Add More Button for this section */}
                {sectionType !== 'primary' && (
                  <TouchableOpacity
                    style={[styles.addMoreButton, { borderColor: typeInfo.color }]}
                    onPress={() => handleAddAddress(sectionType)}
                    activeOpacity={0.7}
                  >
                    <Plus size={20} color={typeInfo.color} />
                    <Text style={[styles.addMoreText, { color: typeInfo.color }]}>
                      Add {sectionType === 'branch' ? 'Branch Office' : 'Warehouse'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  {sectionType === 'primary' 
                    ? 'No primary address added yet' 
                    : `No ${sectionType} addresses added yet`}
                </Text>
                {/* Removed "Add First" button - users can use quick add buttons instead */}
              </View>
            )}
          </View>
        )}
      </View>
    );
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
    // Removed opacity animation to prevent grey background flash
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS === 'ios'}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.replace({
                pathname: '/auth/business-details',
                params: {
                  type: taxIdType,
                  value: taxIdValue,
                  gstinData,
                  name,
                  businessName,
                  businessType,
                  customBusinessType,
                  mobile,
                  // Pass invoice configuration for returning users
                  initialCashBalance,
                  invoicePrefix,
                  invoicePattern,
                  startingInvoiceNumber,
                  fiscalYear,
                }
              });
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={Platform.OS === 'web' ? webContainerStyles.webScrollContent : {}} 
            showsVerticalScrollIndicator={false}
          >
          <Animated.View style={[styles.content, slideTransform]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Check size={48} color="#10b981" strokeWidth={3} />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Address Management</Text>
              <Text style={styles.subtitle}>
                Manage your business addresses by category. Add, edit, or remove locations as needed.
              </Text>
            </View>

            {/* Address Sections */}
            <View style={styles.addressesContainer}>
              {(['primary', 'branch', 'warehouse'] as AddressSection[]).map(renderAddressSection)}
            </View>

            {/* Quick Add Section */}
            <View style={styles.quickAddContainer}>
              <Text style={styles.quickAddTitle}>Quick Add</Text>
              <View style={styles.quickAddButtons}>
                <TouchableOpacity
                  style={[styles.quickAddButton, { backgroundColor: '#f0fdf4', borderColor: '#10b981' }]}
                  onPress={() => handleAddAddress('branch')}
                  activeOpacity={0.7}
                >
                  <Building2 size={24} color="#10b981" />
                  <Text style={[styles.quickAddButtonText, { color: '#10b981' }]}>
                    Add Branch
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickAddButton, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}
                  onPress={() => handleAddAddress('warehouse')}
                  activeOpacity={0.7}
                >
                  <Warehouse size={24} color="#f59e0b" />
                  <Text style={[styles.quickAddButtonText, { color: '#f59e0b' }]}>
                    Add Warehouse
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Setup Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Business Owner Name:</Text>
                <Text style={styles.summaryValue}>{name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Business Name:</Text>
                <Text style={styles.summaryValue}>{businessName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Business Type:</Text>
                <Text style={styles.summaryValue}>
                  {businessType !== 'Others' ? businessType : customBusinessType}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>TAX ID Type:</Text>
                <Text style={styles.summaryValue}>
                  {taxIdType === 'GSTIN' ? 'GSTIN' : 'PAN'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>TAX ID:</Text>
                <Text style={styles.summaryValue}>{taxIdValue}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Addresses:</Text>
                <Text style={styles.summaryValue}>{addresses.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              disabled={isNavigating}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {isNavigating ? 'Loading...' : 'Continue'}
              </Text>
              <ArrowRight size={20} color="#3f66ac" />
            </TouchableOpacity>
          </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModal}>
              <Text style={styles.deleteModalTitle}>Delete Address</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete this address? This action cannot be undone.
              </Text>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteModalCancel}
                  onPress={() => setShowDeleteModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalConfirm}
                  onPress={confirmDeleteAddress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
    </ResponsiveContainer>
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
  keyboardAvoidingView: {
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
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 60,
      default: 40,
    }),
    paddingBottom: Platform.select({
      web: 40,
      ios: 20,
      android: 20, // Consistent bottom padding across all platforms
      default: 20,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 32,
      default: 20,
    }),
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#dcfce7',
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#10b981',
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
  },
  addressesContainer: {
    marginBottom: 32,
  },
  addressSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionContent: {
    paddingTop: 16,
  },
  addressCard: {
    borderRadius: Platform.select({
      web: 16,
      default: 12, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 20,
      default: 14, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 16,
      default: 12, // Reduced spacing on mobile
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1, // Keep consistent
    }),
    borderColor: '#e2e8f0',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.select({
      web: 12,
      default: 8, // Reduced spacing on mobile
    }),
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressTypeIcon: {
    width: Platform.select({
      web: 40,
      default: 36, // Smaller icon for more native feel
    }),
    height: Platform.select({
      web: 40,
      default: 36, // Smaller icon for more native feel
    }),
    borderRadius: Platform.select({
      web: 20,
      default: 18, // Smaller radius for more native feel
    }),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.select({
      web: 12,
      default: 10, // Reduced spacing on mobile
    }),
  },
  addressTypeText: {
    flex: 1,
  },
  addressTypeLabel: {
    fontSize: Platform.select({
      web: 16,
      default: 14, // Reduced for more native feel
    }),
    fontWeight: '600',
    marginBottom: Platform.select({
      web: 2,
      default: 2,
    }),
  },
  addressTypeBadge: {
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text
    }),
    color: '#64748b',
    fontWeight: '500',
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starButton: {
    backgroundColor: '#fef3c7',
  },
  editButton: {
    backgroundColor: '#f1f5f9',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  addressContent: {
    marginTop: 8,
  },
  addressName: {
    fontSize: Platform.select({
      web: 18,
      default: 15, // Reduced for more native feel
    }),
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
  addressText: {
    fontSize: Platform.select({
      web: 14,
      default: 12, // Reduced for truncated text on mobile
    }),
    color: '#64748b',
    lineHeight: Platform.select({
      web: 20,
      default: 16, // Reduced line height for compact text
    }),
    marginBottom: Platform.select({
      web: 12,
      default: 8, // Reduced spacing on mobile
    }),
  },
  stateCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateCodeLabel: {
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text on mobile
    }),
    color: '#64748b',
    marginRight: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
  stateCodeValue: {
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text on mobile
    }),
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.select({
      web: 12,
      default: 10, // Reduced for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 20,
      default: 16, // Reduced for more native feel
    }),
    borderRadius: Platform.select({
      web: 8,
      default: 10, // Consistent with other buttons
    }),
    gap: Platform.select({
      web: 8,
      default: 6, // Reduced gap on mobile
    }),
  },
  addFirstButtonText: {
    fontSize: Platform.select({
      web: 14,
      default: 13, // Reduced for more native feel
    }),
    fontWeight: '600',
    color: '#ffffff',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderStyle: 'dashed',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Consistent with other buttons
    }),
    paddingVertical: Platform.select({
      web: 16,
      default: 12, // Reduced for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Reduced for more native feel
    }),
    gap: Platform.select({
      web: 8,
      default: 6, // Reduced gap on mobile
    }),
  },
  addMoreText: {
    fontSize: Platform.select({
      web: 16,
      default: 13, // Reduced for more native feel
    }),
    fontWeight: '600',
  },
  quickAddContainer: {
    marginBottom: 32,
  },
  quickAddTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  quickAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc754',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f66ac',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Contact person styles
  contactContainer: {
    marginTop: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  contactText: {
    fontSize: Platform.select({
      web: 14,
      default: 12, // Reduced for truncated text on mobile
    }),
    fontWeight: '500',
    marginRight: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
});