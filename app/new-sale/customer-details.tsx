import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Building2,
  Search,
  X,
  Mail,
  Plus,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  FileText,
} from 'lucide-react-native';
import GoogleAddressAutocomplete from '@/components/GoogleAddressAutocomplete';
import { getCustomers, getInvoices } from '@/services/backendApi';
import { cartDataBridge, saleFlowBridge, InvoiceExtras } from '@/utils/productStore';
import { useBusinessData } from '@/hooks/useBusinessData';
import { autoFormatDateInput, validateDateDDMMYYYY } from '@/utils/formatters';

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

interface StructuredAddress {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  state: string;
  pincode: string;
}

interface CustomerData {
  id?: string;
  name: string;
  mobile: string;
  email?: string;
  isBusinessCustomer: boolean;
  gstin?: string;
  businessName?: string;
  paymentTerms?: string;
  billingAddress: StructuredAddress;
  shippingAddress: StructuredAddress;
  shippingSameAsBilling: boolean;
  address?: string;
  businessAddress?: string;
  shipToAddress?: string;
  selectedBusinessAddress?: any;
  selectedShipToAddress?: any;
  selectedIndividualAddress?: any;
}

interface ExistingCustomer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  isBusinessCustomer: boolean;
  gstin?: string;
  businessName?: string;
  paymentTerms?: string;
  address?: string;
}

const emptyAddress: StructuredAddress = { line1: '', line2: '', line3: '', city: '', state: '', pincode: '' };

const presetPaymentTerms = [
  'Net 30 Days',
  'Net 15 Days',
  'Net 7 Days',
  'Due on Receipt',
  'Cash on Delivery (COD)',
  '2/10 Net 30',
  'Others'
];

function formatStructuredAddress(addr: StructuredAddress): string {
  return [addr.line1, addr.line2, addr.line3, addr.city, addr.state, addr.pincode]
    .filter(p => p.trim().length > 0)
    .join(', ');
}

function parseAddressToStructured(address: string): StructuredAddress {
  if (!address) return { ...emptyAddress };
  const parts = address.split(',').map(p => p.trim());
  return {
    line1: parts[0] || '',
    line2: parts[1] || '',
    line3: parts[2] || '',
    city: parts[3] || '',
    state: parts[4] || '',
    pincode: parts[5] || '',
  };
}

let _customerCache: ExistingCustomer[] | null = null;
let _customerCacheTime = 0;
const CUSTOMER_CACHE_MS = 30000;

export default function CustomerDetailsScreen() {
  const { preSelectedCustomer } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  useBusinessData();

  const [cartData] = useState(() => {
    const data = cartDataBridge.consumeCartData();
    if (data) {
      saleFlowBridge.setCartAndTotal(data.cartItems, data.totalAmount, data.roundOffAmount);
    }
    return data;
  });

  const [screenMode, setScreenMode] = useState<'select' | 'add'>('select');
  const [selectedCustomer, setSelectedCustomer] = useState<ExistingCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    mobile: '',
    isBusinessCustomer: false,
    billingAddress: { ...emptyAddress },
    shippingAddress: { ...emptyAddress },
    shippingSameAsBilling: true,
  });
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [gstinSearch, setGstinSearch] = useState('');
  const [isLoadingGstin, setIsLoadingGstin] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [customPaymentTerms, setCustomPaymentTerms] = useState('');

  const [extraFieldsEnabled, setExtraFieldsEnabled] = useState(false);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([]);
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [invoiceExtras, setInvoiceExtras] = useState<InvoiceExtras>({
    deliveryNote: '',
    paymentTermsMode: '',
    referenceNo: '',
    referenceDate: '',
    buyerOrderNumber: '',
    buyerOrderDate: '',
    dispatchDocNo: '',
    deliveryNoteDate: '',
    dispatchedVia: '',
    destination: '',
    termsOfDelivery: '',
    customFields: [],
  });

  useEffect(() => {
    AsyncStorage.getItem('@invoice_extra_fields_enabled').then(val => {
      if (val === 'true') setExtraFieldsEnabled(true);
    }).catch(() => {});
    AsyncStorage.getItem('@invoice_selected_fields').then(val => {
      if (val) { try { setSelectedFieldKeys(JSON.parse(val)); } catch {} }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingCustomers(true);
      try {
        const now = Date.now();
        let customers: ExistingCustomer[];

        if (_customerCache && (now - _customerCacheTime) < CUSTOMER_CACHE_MS) {
          customers = _customerCache;
        } else {
          const result = await getCustomers();
          customers = (result.success && result.customers)
            ? result.customers.map((c: any) => ({
                id: c.id,
                name: c.name,
                mobile: c.mobile || '',
                email: c.email,
                isBusinessCustomer: c.customer_type === 'business',
                gstin: c.gstin,
                businessName: c.business_name,
                paymentTerms: c.payment_terms,
                address: c.address || '',
              }))
            : [];
          _customerCache = customers;
          _customerCacheTime = Date.now();
        }

        setExistingCustomers(customers);

        const invoiceResult = await getInvoices();
        if (invoiceResult.success && invoiceResult.invoices) {
          const sorted = invoiceResult.invoices
            .filter((inv: any) => inv.customer_id)
            .sort((a: any, b: any) => new Date(b.created_at || b.invoice_date).getTime() - new Date(a.created_at || a.invoice_date).getTime());
          const seen = new Set<string>();
          const recentIds: string[] = [];
          for (const inv of sorted) {
            if (!seen.has(inv.customer_id)) {
              seen.add(inv.customer_id);
              recentIds.push(inv.customer_id);
              if (recentIds.length >= 5) break;
            }
          }
          setRecentCustomerIds(recentIds);
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setIsLoadingCustomers(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (preSelectedCustomer) {
      try {
        const preSelected = JSON.parse(preSelectedCustomer as string);
        setScreenMode('add');
        setCustomer(prev => ({
          ...prev,
          ...preSelected,
          billingAddress: preSelected.billingAddress || parseAddressToStructured(preSelected.address || preSelected.businessAddress || ''),
          shippingAddress: preSelected.shippingAddress || { ...emptyAddress },
          shippingSameAsBilling: true,
        }));
      } catch {}
    }
  }, [preSelectedCustomer]);

  const recentCustomers = useMemo(() => {
    if (!recentCustomerIds.length || !existingCustomers.length) return [];
    const map = new Map(existingCustomers.map(c => [c.id, c]));
    return recentCustomerIds.map(id => map.get(id)).filter(Boolean) as ExistingCustomer[];
  }, [recentCustomerIds, existingCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return existingCustomers;
    const term = customerSearch.toLowerCase();
    return existingCustomers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      (c.businessName && c.businessName.toLowerCase().includes(term)) ||
      (c.gstin && c.gstin.toLowerCase().includes(term))
    );
  }, [customerSearch, existingCustomers]);

  const handleSelectExisting = useCallback((c: ExistingCustomer) => {
    setSelectedCustomer(prev => prev?.id === c.id ? null : c);
  }, []);

  const handleProceedWithSelected = useCallback(() => {
    if (isNavigating || !selectedCustomer) return;

    const dateFields = [
      { value: invoiceExtras.referenceDate, label: 'Reference Date' },
      { value: invoiceExtras.buyerOrderDate, label: "Buyer's Order Date" },
      { value: invoiceExtras.deliveryNoteDate, label: 'Delivery Note Date' },
    ];
    for (const df of dateFields) {
      if (df.value && df.value.length > 0) {
        const err = validateDateDDMMYYYY(df.value);
        if (err) {
          Alert.alert('Invalid Date', `${df.label}: ${err}`);
          return;
        }
      }
    }

    setIsNavigating(true);

    const custForBridge: any = {
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      mobile: selectedCustomer.mobile,
      email: selectedCustomer.email,
      isBusinessCustomer: selectedCustomer.isBusinessCustomer,
      gstin: selectedCustomer.gstin,
      businessName: selectedCustomer.businessName,
      paymentTerms: selectedCustomer.paymentTerms,
      address: selectedCustomer.address,
      businessAddress: selectedCustomer.isBusinessCustomer ? selectedCustomer.address : undefined,
    };
    saleFlowBridge.setCustomerDetails(custForBridge);
    if (extraFieldsEnabled && hasInvoiceExtras()) {
      saleFlowBridge.setInvoiceExtras(cleanInvoiceExtras());
    }
    router.push({ pathname: '/new-sale/payment', params: {} });
    setTimeout(() => setIsNavigating(false), 1500);
  }, [isNavigating, selectedCustomer, extraFieldsEnabled, invoiceExtras]);

  const handleGstinLookup = async () => {
    const gstinUpper = gstinSearch.toUpperCase().trim();
    if (!gstinUpper) {
      Alert.alert('Invalid GSTIN', 'Please enter a valid GSTIN number');
      return;
    }
    setIsLoadingGstin(true);
    try {
      const { verifyGSTIN } = require('@/services/backendApi');
      const result = await verifyGSTIN(gstinUpper);
      if (!result.success) {
        Alert.alert('GSTIN Verification Failed', result.error || 'Invalid GSTIN number');
      } else if (result.taxpayerInfo) {
        const d = result.taxpayerInfo;
        const addr = d.pradr?.addr;
        const billing: StructuredAddress = addr ? {
          line1: [addr.bno, addr.bnm].filter(Boolean).join(' ').trim(),
          line2: [addr.st, addr.loc].filter(Boolean).join(', ').trim(),
          line3: addr.city || '',
          city: addr.dst || addr.city || '',
          state: addr.stcd || '',
          pincode: addr.pncd || '',
        } : { ...emptyAddress };

        setCustomer(prev => ({
          ...prev,
          businessName: d.tradeNam || d.lgnm || '',
          name: d.lgnm || prev.name,
          gstin: gstinUpper,
          billingAddress: billing,
          businessAddress: formatStructuredAddress(billing),
          selectedBusinessAddress: addr ? { formatted_address: formatStructuredAddress(billing) } : undefined,
        }));
        setShowGstinModal(false);
        setGstinSearch('');
        Alert.alert('GSTIN Found', 'Business details and address have been auto-filled');
      } else {
        Alert.alert('GSTIN Not Found', 'No data found for this GSTIN number');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Please check your connection and try again');
    } finally {
      setIsLoadingGstin(false);
    }
  };

  const handleAddressSelect = useCallback((addressData: any, type: 'billing' | 'shipping') => {
    const structured: StructuredAddress = {
      line1: [addressData.placeName, addressData.street].filter(Boolean).join(', ').trim() || addressData.route || '',
      line2: [addressData.sublocality, addressData.neighborhood].filter(Boolean).join(', ').trim(),
      line3: '',
      city: addressData.locality || addressData.city || '',
      state: addressData.state || '',
      pincode: addressData.pincode || addressData.postal_code || '',
    };
    if (type === 'billing') {
      const formatted = formatStructuredAddress(structured);
      setCustomer(prev => ({
        ...prev,
        billingAddress: structured,
        address: formatted,
        businessAddress: prev.isBusinessCustomer ? formatted : prev.businessAddress,
        selectedBusinessAddress: prev.isBusinessCustomer ? { formatted_address: formatted, ...addressData } : prev.selectedBusinessAddress,
        selectedIndividualAddress: !prev.isBusinessCustomer ? { formatted_address: formatted, ...addressData } : prev.selectedIndividualAddress,
      }));
    } else {
      const formatted = formatStructuredAddress(structured);
      setCustomer(prev => ({
        ...prev,
        shippingAddress: structured,
        shipToAddress: formatted,
        selectedShipToAddress: { formatted_address: formatted, ...addressData },
      }));
    }
  }, []);

  const handlePaymentTermsSelect = (terms: string) => {
    if (terms === 'Others') {
      setCustomPaymentTerms('');
      setShowPaymentTermsModal(false);
    } else {
      setCustomPaymentTerms('');
      setCustomer(prev => ({ ...prev, paymentTerms: terms }));
      setShowPaymentTermsModal(false);
    }
  };

  const handleCustomPaymentTermsSubmit = () => {
    if (customPaymentTerms.trim()) {
      setCustomer(prev => ({ ...prev, paymentTerms: customPaymentTerms.trim() }));
      setCustomPaymentTerms('');
    }
  };

  const handleAddAndProceed = () => {
    if (isNavigating) return;
    if (!customer.name.trim() || !customer.mobile.trim()) {
      Alert.alert('Incomplete Details', 'Please fill in customer name and mobile number');
      return;
    }
    if (customer.mobile.length !== 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsNavigating(true);
    const billingStr = formatStructuredAddress(customer.billingAddress);
    const shippingStr = customer.shippingSameAsBilling ? billingStr : formatStructuredAddress(customer.shippingAddress);

    const custForBridge: any = {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      isBusinessCustomer: customer.isBusinessCustomer,
      gstin: customer.gstin,
      businessName: customer.businessName,
      paymentTerms: customer.paymentTerms,
      address: billingStr,
      businessAddress: customer.isBusinessCustomer ? billingStr : undefined,
      shipToAddress: shippingStr !== billingStr ? shippingStr : undefined,
      selectedBusinessAddress: customer.selectedBusinessAddress,
      selectedShipToAddress: customer.selectedShipToAddress,
      selectedIndividualAddress: customer.selectedIndividualAddress,
    };
    saleFlowBridge.setCustomerDetails(custForBridge);
    if (extraFieldsEnabled && hasInvoiceExtras()) {
      saleFlowBridge.setInvoiceExtras(cleanInvoiceExtras());
    }
    router.push({ pathname: '/new-sale/payment', params: {} });
    setTimeout(() => setIsNavigating(false), 1500);
  };

  const hasInvoiceExtras = () => {
    const e = invoiceExtras;
    return !!(e.deliveryNote?.trim() || e.paymentTermsMode?.trim() || e.referenceNo?.trim() ||
      e.referenceDate?.trim() || e.buyerOrderNumber?.trim() || e.buyerOrderDate?.trim() ||
      e.dispatchDocNo?.trim() || e.deliveryNoteDate?.trim() || e.dispatchedVia?.trim() ||
      e.destination?.trim() || e.termsOfDelivery?.trim() ||
      (e.customFields && e.customFields.some(f => f.label.trim() && f.value.trim())));
  };

  const cleanInvoiceExtras = (): InvoiceExtras => ({
    deliveryNote: invoiceExtras.deliveryNote?.trim() || undefined,
    paymentTermsMode: invoiceExtras.paymentTermsMode?.trim() || undefined,
    referenceNo: invoiceExtras.referenceNo?.trim() || undefined,
    referenceDate: invoiceExtras.referenceDate?.trim() || undefined,
    buyerOrderNumber: invoiceExtras.buyerOrderNumber?.trim() || undefined,
    buyerOrderDate: invoiceExtras.buyerOrderDate?.trim() || undefined,
    dispatchDocNo: invoiceExtras.dispatchDocNo?.trim() || undefined,
    deliveryNoteDate: invoiceExtras.deliveryNoteDate?.trim() || undefined,
    dispatchedVia: invoiceExtras.dispatchedVia?.trim() || undefined,
    destination: invoiceExtras.destination?.trim() || undefined,
    termsOfDelivery: invoiceExtras.termsOfDelivery?.trim() || undefined,
    customFields: invoiceExtras.customFields?.filter(f => f.label.trim() && f.value.trim()),
  });

  const addCustomField = () => {
    setInvoiceExtras(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }],
    }));
  };

  const updateCustomField = (idx: number, key: 'label' | 'value', val: string) => {
    setInvoiceExtras(prev => ({
      ...prev,
      customFields: (prev.customFields || []).map((f, i) => i === idx ? { ...f, [key]: val } : f),
    }));
  };

  const removeCustomField = (idx: number) => {
    setInvoiceExtras(prev => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, i) => i !== idx),
    }));
  };

  const renderCustomerItem = useCallback(({ item }: { item: ExistingCustomer }) => {
    const isSelected = selectedCustomer?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.customerCard, isSelected && styles.customerCardSelected]}
        onPress={() => handleSelectExisting(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.customerAvatar, isSelected && styles.customerAvatarSelected]}>
          {isSelected ? (
            <Check size={18} color="#fff" />
          ) : (
            <User size={18} color={Colors.primary} />
          )}
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.isBusinessCustomer ? (item.businessName || item.name) : item.name}
          </Text>
          <Text style={styles.customerMeta} numberOfLines={1}>
            {item.mobile}{item.isBusinessCustomer ? ' \u2022 Business' : ''}
            {item.gstin ? ` \u2022 ${item.gstin}` : ''}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.grey[300]} />
      </TouchableOpacity>
    );
  }, [selectedCustomer, handleSelectExisting]);

  // =========== SELECT MODE ===========
  if (screenMode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Customer</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Search by name, mobile, GSTIN..."
              placeholderTextColor={Colors.textLight}
              autoCorrect={false}
            />
            {customerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearch('')}>
                <X size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoadingCustomers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              !customerSearch.trim() && recentCustomers.length > 0 ? (
                <View style={styles.recentSection}>
                  <View style={styles.sectionHeader}>
                    <Clock size={16} color={Colors.textLight} />
                    <Text style={styles.sectionLabel}>Recently Billed</Text>
                  </View>
                  {recentCustomers.map(rc => (
                    <TouchableOpacity
                      key={rc.id}
                      style={[styles.recentCard, selectedCustomer?.id === rc.id && styles.customerCardSelected]}
                      onPress={() => handleSelectExisting(rc)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.recentAvatar, selectedCustomer?.id === rc.id && styles.customerAvatarSelected]}>
                        {selectedCustomer?.id === rc.id ? (
                          <Check size={14} color="#fff" />
                        ) : (
                          <Clock size={14} color={Colors.primary} />
                        )}
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>
                          {rc.isBusinessCustomer ? (rc.businessName || rc.name) : rc.name}
                        </Text>
                        <Text style={styles.recentMeta} numberOfLines={1}>{rc.mobile}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.sectionDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>All Customers</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <User size={48} color={Colors.grey[300]} />
                <Text style={styles.emptyText}>
                  {customerSearch.trim() ? 'No customers found' : 'No customers yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {customerSearch.trim() ? 'Try a different search term' : 'Add your first customer below'}
                </Text>
              </View>
            }
          />
        )}

        {/* Bottom button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {selectedCustomer ? (
            <TouchableOpacity
              style={[styles.primaryButton, isNavigating && styles.buttonDisabled]}
              onPress={handleProceedWithSelected}
              activeOpacity={0.8}
              disabled={isNavigating}
            >
              <Check size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isNavigating ? 'Loading...' : 'Proceed to Payment'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setScreenMode('add')}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Add New Customer</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // =========== ADD MODE ===========
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setScreenMode('select');
            setCustomer({
              name: '', mobile: '', isBusinessCustomer: false,
              billingAddress: { ...emptyAddress }, shippingAddress: { ...emptyAddress },
              shippingSameAsBilling: true,
            });
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Customer</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}
        enabled={Platform.OS === 'android'}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.formScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Customer Type Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !customer.isBusinessCustomer && styles.activeToggle]}
                onPress={() => setCustomer(prev => ({ ...prev, isBusinessCustomer: false }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, !customer.isBusinessCustomer && styles.activeToggleText]}>
                  Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, customer.isBusinessCustomer && styles.activeToggle]}
                onPress={() => setCustomer(prev => ({ ...prev, isBusinessCustomer: true }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, customer.isBusinessCustomer && styles.activeToggleText]}>
                  Business
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GSTIN Lookup */}
          {customer.isBusinessCustomer && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.gstinButton}
                onPress={() => setShowGstinModal(true)}
                activeOpacity={0.7}
              >
                <Building2 size={20} color={Colors.primary} />
                <Text style={styles.gstinButtonText}>
                  {customer.gstin ? `GSTIN: ${customer.gstin}` : 'Enter GSTIN to auto-fill details'}
                </Text>
                <Search size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.section}>
            {customer.isBusinessCustomer && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Name *</Text>
                <View style={styles.fieldInput}>
                  <Building2 size={18} color={Colors.textLight} />
                  <TextInput
                    style={styles.fieldTextInput}
                    value={customer.businessName || ''}
                    onChangeText={t => setCustomer(prev => ({ ...prev, businessName: t }))}
                    placeholder="Enter business name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {customer.isBusinessCustomer && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>GSTIN</Text>
                <View style={styles.fieldInput}>
                  <Building2 size={18} color={Colors.textLight} />
                  <TextInput
                    style={styles.fieldTextInput}
                    value={customer.gstin || ''}
                    onChangeText={t => setCustomer(prev => ({ ...prev, gstin: t.toUpperCase() }))}
                    placeholder="Enter GSTIN number"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {customer.isBusinessCustomer ? 'Contact Person Name *' : 'Customer Name *'}
              </Text>
              <View style={styles.fieldInput}>
                <User size={18} color={Colors.textLight} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={customer.name}
                  onChangeText={t => setCustomer(prev => ({ ...prev, name: t }))}
                  placeholder="Enter name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number *</Text>
              <View style={styles.fieldInput}>
                <Phone size={18} color={Colors.textLight} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={customer.mobile}
                  onChangeText={t => setCustomer(prev => ({ ...prev, mobile: t.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="Enter mobile number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.fieldInput}>
                <Mail size={18} color={Colors.textLight} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={customer.email || ''}
                  onChangeText={t => setCustomer(prev => ({ ...prev, email: t }))}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {customer.isBusinessCustomer && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Payment Terms</Text>
                {customer.paymentTerms === 'Others' || (customer.paymentTerms && !presetPaymentTerms.includes(customer.paymentTerms)) ? (
                  <View style={styles.customTermsRow}>
                    <View style={[styles.fieldInput, styles.flex1]}>
                      <TextInput
                        style={styles.fieldTextInput}
                        value={customPaymentTerms || customer.paymentTerms}
                        onChangeText={setCustomPaymentTerms}
                        placeholder="Enter custom payment terms"
                        placeholderTextColor={Colors.textLight}
                        onSubmitEditing={handleCustomPaymentTermsSubmit}
                        onBlur={handleCustomPaymentTermsSubmit}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.presetButton}
                      onPress={() => setShowPaymentTermsModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.presetButtonText}>Preset</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() => setShowPaymentTermsModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectFieldText, !customer.paymentTerms && styles.placeholderColor]}>
                      {customer.paymentTerms || 'Select payment terms'}
                    </Text>
                    <ChevronRight size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Billing Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {customer.isBusinessCustomer ? 'Billing Address' : 'Address'}
            </Text>

            <GoogleAddressAutocomplete
              placeholder={customer.isBusinessCustomer ? 'Search for business address...' : 'Search for address...'}
              onAddressSelect={(addr) => handleAddressSelect(addr, 'billing')}
            />

            <View style={styles.addressFields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address Line 1 *</Text>
                <TextInput
                  style={styles.addressFieldInput}
                  value={customer.billingAddress.line1}
                  onChangeText={t => setCustomer(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, line1: t },
                  }))}
                  placeholder="Building no., name, street"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address Line 2</Text>
                <TextInput
                  style={styles.addressFieldInput}
                  value={customer.billingAddress.line2}
                  onChangeText={t => setCustomer(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, line2: t },
                  }))}
                  placeholder="Area, locality"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address Line 3</Text>
                <TextInput
                  style={styles.addressFieldInput}
                  value={customer.billingAddress.line3}
                  onChangeText={t => setCustomer(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, line3: t },
                  }))}
                  placeholder="Landmark (optional)"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={styles.addressFieldInput}
                    value={customer.billingAddress.city}
                    onChangeText={t => setCustomer(prev => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, city: t },
                    }))}
                    placeholder="City"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.fieldLabel}>State *</Text>
                  <TextInput
                    style={styles.addressFieldInput}
                    value={customer.billingAddress.state}
                    onChangeText={t => setCustomer(prev => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, state: t },
                    }))}
                    placeholder="State"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pincode *</Text>
                <TextInput
                  style={[styles.addressFieldInput, { width: '50%' }]}
                  value={customer.billingAddress.pincode}
                  onChangeText={t => setCustomer(prev => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, pincode: t },
                  }))}
                  placeholder="Pincode"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, customer.shippingSameAsBilling && styles.activeToggle]}
                onPress={() => setCustomer(prev => ({ ...prev, shippingSameAsBilling: true }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, customer.shippingSameAsBilling && styles.activeToggleText]}>
                  Same as Billing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !customer.shippingSameAsBilling && styles.activeToggle]}
                onPress={() => setCustomer(prev => ({ ...prev, shippingSameAsBilling: false }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, !customer.shippingSameAsBilling && styles.activeToggleText]}>
                  Different
                </Text>
              </TouchableOpacity>
            </View>

            {!customer.shippingSameAsBilling && (
              <>
                <View style={{ marginTop: 16 }}>
                  <GoogleAddressAutocomplete
                    placeholder="Search for shipping address..."
                    onAddressSelect={(addr) => handleAddressSelect(addr, 'shipping')}
                  />
                </View>
                <View style={styles.addressFields}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Address Line 1 *</Text>
                    <TextInput
                      style={styles.addressFieldInput}
                      value={customer.shippingAddress.line1}
                      onChangeText={t => setCustomer(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, line1: t },
                      }))}
                      placeholder="Building no., name, street"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Address Line 2</Text>
                    <TextInput
                      style={styles.addressFieldInput}
                      value={customer.shippingAddress.line2}
                      onChangeText={t => setCustomer(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, line2: t },
                      }))}
                      placeholder="Area, locality"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Address Line 3</Text>
                    <TextInput
                      style={styles.addressFieldInput}
                      value={customer.shippingAddress.line3}
                      onChangeText={t => setCustomer(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, line3: t },
                      }))}
                      placeholder="Landmark (optional)"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, styles.flex1]}>
                      <Text style={styles.fieldLabel}>City *</Text>
                      <TextInput
                        style={styles.addressFieldInput}
                        value={customer.shippingAddress.city}
                        onChangeText={t => setCustomer(prev => ({
                          ...prev,
                          shippingAddress: { ...prev.shippingAddress, city: t },
                        }))}
                        placeholder="City"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                    <View style={[styles.fieldGroup, styles.flex1]}>
                      <Text style={styles.fieldLabel}>State *</Text>
                      <TextInput
                        style={styles.addressFieldInput}
                        value={customer.shippingAddress.state}
                        onChangeText={t => setCustomer(prev => ({
                          ...prev,
                          shippingAddress: { ...prev.shippingAddress, state: t },
                        }))}
                        placeholder="State"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Pincode *</Text>
                    <TextInput
                      style={[styles.addressFieldInput, { width: '50%' }]}
                      value={customer.shippingAddress.pincode}
                      onChangeText={t => setCustomer(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, pincode: t },
                      }))}
                      placeholder="Pincode"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Additional Invoice Details */}
          {extraFieldsEnabled && selectedFieldKeys.length > 0 && (
            <View style={[styles.section, { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: 12 }]}>
              <TouchableOpacity
                style={styles.extraFieldsHeader}
                onPress={() => setShowExtraFields(!showExtraFields)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                    <FileText size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E' }}>Additional Invoice Details</Text>
                    <Text style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>Tap to {showExtraFields ? 'collapse' : 'fill optional fields'}</Text>
                  </View>
                </View>
                {showExtraFields ? <ChevronUp size={20} color="#B45309" /> : <ChevronDown size={20} color="#B45309" />}
              </TouchableOpacity>

              {showExtraFields && (
                <View style={{ marginTop: 12 }}>
                  {selectedFieldKeys.includes('delivery_note') && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Delivery Note</Text>
                      <TextInput style={styles.textField} value={invoiceExtras.deliveryNote} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, deliveryNote: t }))} placeholder="Delivery note number" placeholderTextColor={Colors.textLight} />
                    </View>
                  )}
                  {selectedFieldKeys.includes('payment_terms') && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Mode/Terms of Payment</Text>
                      <TextInput style={styles.textField} value={invoiceExtras.paymentTermsMode} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, paymentTermsMode: t }))} placeholder="e.g. Net 30, COD" placeholderTextColor={Colors.textLight} />
                    </View>
                  )}
                  <View style={styles.rowFields}>
                    {selectedFieldKeys.includes('reference_no') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Reference No.</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.referenceNo} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, referenceNo: t }))} placeholder="Reference number" placeholderTextColor={Colors.textLight} />
                      </View>
                    )}
                    {selectedFieldKeys.includes('reference_date') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Date (Ref. No.)</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.referenceDate} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, referenceDate: autoFormatDateInput(t, '/') }))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={10} />
                        {invoiceExtras.referenceDate.length === 10 && validateDateDDMMYYYY(invoiceExtras.referenceDate) && (
                          <Text style={{ fontSize: 11, color: Colors.error, marginTop: 2 }}>{validateDateDDMMYYYY(invoiceExtras.referenceDate)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowFields}>
                    {selectedFieldKeys.includes('buyers_order_no') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Buyer's Order No.</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.buyerOrderNumber} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, buyerOrderNumber: t }))} placeholder="Order number" placeholderTextColor={Colors.textLight} />
                      </View>
                    )}
                    {selectedFieldKeys.includes('buyers_order_date') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Date (Buyer's Order)</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.buyerOrderDate} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, buyerOrderDate: autoFormatDateInput(t, '/') }))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={10} />
                        {invoiceExtras.buyerOrderDate.length === 10 && validateDateDDMMYYYY(invoiceExtras.buyerOrderDate) && (
                          <Text style={{ fontSize: 11, color: Colors.error, marginTop: 2 }}>{validateDateDDMMYYYY(invoiceExtras.buyerOrderDate)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowFields}>
                    {selectedFieldKeys.includes('dispatch_doc_no') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Dispatch Doc No.</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.dispatchDocNo} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, dispatchDocNo: t }))} placeholder="Document number" placeholderTextColor={Colors.textLight} />
                      </View>
                    )}
                    {selectedFieldKeys.includes('delivery_note_date') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Delivery Note Date</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.deliveryNoteDate} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, deliveryNoteDate: autoFormatDateInput(t, '/') }))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={10} />
                        {invoiceExtras.deliveryNoteDate.length === 10 && validateDateDDMMYYYY(invoiceExtras.deliveryNoteDate) && (
                          <Text style={{ fontSize: 11, color: Colors.error, marginTop: 2 }}>{validateDateDDMMYYYY(invoiceExtras.deliveryNoteDate)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowFields}>
                    {selectedFieldKeys.includes('dispatched_through') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Dispatched Through</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.dispatchedVia} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, dispatchedVia: t }))} placeholder="e.g. Courier, Transport" placeholderTextColor={Colors.textLight} />
                      </View>
                    )}
                    {selectedFieldKeys.includes('destination') && (
                      <View style={[styles.fieldGroup, styles.flex1]}>
                        <Text style={styles.fieldLabel}>Destination</Text>
                        <TextInput style={styles.textField} value={invoiceExtras.destination} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, destination: t }))} placeholder="Delivery destination" placeholderTextColor={Colors.textLight} />
                      </View>
                    )}
                  </View>
                  {selectedFieldKeys.includes('terms_of_delivery') && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Terms of Delivery</Text>
                      <TextInput style={styles.textField} value={invoiceExtras.termsOfDelivery} onChangeText={t => setInvoiceExtras(prev => ({ ...prev, termsOfDelivery: t }))} placeholder="Delivery terms and conditions" placeholderTextColor={Colors.textLight} />
                    </View>
                  )}

                  {/* Custom Fields */}
                  {(invoiceExtras.customFields || []).map((cf, idx) => (
                    <View key={idx} style={styles.customFieldRow}>
                      <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Field Name</Text>
                        <TextInput style={styles.textField} value={cf.label} onChangeText={t => updateCustomField(idx, 'label', t)} placeholder="Field name" placeholderTextColor={Colors.textLight} />
                      </View>
                      <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Value</Text>
                        <TextInput style={styles.textField} value={cf.value} onChangeText={t => updateCustomField(idx, 'value', t)} placeholder="Field value" placeholderTextColor={Colors.textLight} />
                      </View>
                      <TouchableOpacity onPress={() => removeCustomField(idx)} style={{ paddingTop: 22, paddingHorizontal: 4 }}>
                        <Trash2 size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addCustomFieldBtn} onPress={addCustomField} activeOpacity={0.7}>
                    <Plus size={14} color={Colors.primary} />
                    <Text style={styles.addCustomFieldText}>Add Custom Field</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.primaryButton, isNavigating && styles.buttonDisabled]}
          onPress={handleAddAndProceed}
          activeOpacity={0.8}
          disabled={isNavigating}
        >
          <Text style={styles.primaryButtonText}>
            {isNavigating ? 'Loading...' : 'Add Customer & Proceed to Payment'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* GSTIN Lookup Modal */}
      <Modal
        visible={showGstinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGstinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GSTIN Lookup</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowGstinModal(false)} activeOpacity={0.7}>
                <X size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalDesc}>
                Enter the GSTIN number to automatically fetch business details and address
              </Text>
              <TextInput
                style={styles.gstinInput}
                value={gstinSearch}
                onChangeText={t => setGstinSearch(t.toUpperCase())}
                placeholder="Enter 15-digit GSTIN"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
                maxLength={15}
              />
              <TouchableOpacity
                style={[styles.primaryButton, (!gstinSearch.trim() || isLoadingGstin) && styles.buttonDisabled]}
                onPress={handleGstinLookup}
                disabled={!gstinSearch.trim() || isLoadingGstin}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoadingGstin ? 'Looking up...' : 'Lookup GSTIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Terms Modal */}
      <Modal
        visible={showPaymentTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Terms</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowPaymentTermsModal(false)} activeOpacity={0.7}>
                <X size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {presetPaymentTerms.map((terms, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.termOption, customer.paymentTerms === terms && styles.termOptionActive]}
                    onPress={() => handlePaymentTermsSelect(terms)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.termOptionText, customer.paymentTerms === terms && styles.termOptionActiveText]}>
                      {terms}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  flex1: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
    paddingVertical: 2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Recent section
  recentSection: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  recentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recentMeta: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grey[200],
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },

  // Customer card
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  customerCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F4FF',
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerAvatarSelected: {
    backgroundColor: Colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  customerMeta: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Form (add mode)
  formScroll: {
    padding: 16,
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeToggleText: {
    color: '#fff',
  },
  gstinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  gstinButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  fieldTextInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 2,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectFieldText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  placeholderColor: {
    color: Colors.textLight,
  },
  customTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presetButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  presetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Address fields
  addressFields: {
    marginTop: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  addressFieldInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalDesc: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  gstinInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  termOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  termOptionActive: {
    backgroundColor: '#F0F4FF',
  },
  termOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  termOptionActiveText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  extraFieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textField: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: Colors.text,
  },
  customFieldRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addCustomFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addCustomFieldText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
});
