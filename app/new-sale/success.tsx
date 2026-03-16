import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { CircleCheck as CheckCircle, Download, Share, Printer, Chrome as Home, ShoppingCart, FileText, X } from 'lucide-react-native';
import { Sale, SaleItem } from '@/utils/dataStore';
import { createInvoice, getNextInvoiceNumber, createCustomer, createInAppNotification } from '@/services/backendApi';
import { formatCurrencyINR } from '@/utils/formatters';
import { usePermissions } from '@/contexts/PermissionContext';
import { paymentDataBridge, saleFlowBridge } from '@/utils/productStore';
import { generateInvoicePDF, printInvoice, InvoicePDFData } from '@/utils/invoicePdfGenerator';
import { shareInvoicePDF, showShareOptions } from '@/utils/invoiceShareUtils';
import { supabase } from '@/lib/supabase';
import { useBusinessData } from '@/hooks/useBusinessData';
import { safeRouter } from '@/utils/safeRouter';

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

const getUoMPrice = (item: any): number => {
  const basePrimary = item.price || 0;
  const uom = item.selectedUoM || 'primary';
  if (uom === 'primary' || !item.conversionRatio) return basePrimary;
  const conv = parseFloat(item.conversionRatio || '1');
  if (uom === 'secondary') return basePrimary / conv;
  if (uom === 'tertiary' && item.tertiaryConversionRatio) {
    return basePrimary / (conv * parseFloat(item.tertiaryConversionRatio || '1'));
  }
  return basePrimary;
};

const getUoMUnit = (item: any): string => {
  const uom = item.selectedUoM || 'primary';
  if (uom === 'secondary') return item.secondaryUnit || item.primaryUnit || 'unit';
  if (uom === 'tertiary') return item.tertiaryUnit || item.primaryUnit || 'unit';
  return item.primaryUnit || 'unit';
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}${day}-${random}`;
};

export default function SaleSuccessScreen() {
  const { paymentData } = useLocalSearchParams();

  const paymentRef = useRef<any>(null);
  if (!paymentRef.current) {
    const bridgeData = paymentDataBridge.consumePaymentData();
    if (bridgeData) {
      paymentRef.current = bridgeData;
    } else {
      try { paymentRef.current = paymentData ? JSON.parse(paymentData as string) : null; } catch { paymentRef.current = null; }
    }
  }
  const payment = paymentRef.current;
  const invoiceExtrasRef = useRef(saleFlowBridge.getInvoiceExtras?.() || undefined);

  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(() => generateInvoiceNumber());
  const hasSavedRef = useRef(false);
  const createdInvoiceIdRef = useRef<string | undefined>(undefined);
  const { data: businessData } = useBusinessData();
  const { isStaff, staffId, staffName, staffBusinessId } = usePermissions();

  const isValid = payment && payment.customer && payment.cartItems && Array.isArray(payment.cartItems);
  const navigation = useNavigation();

  // Prevent hardware/gesture back - redirect to dashboard instead
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      safeRouter.replace('/dashboard');
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        safeRouter.replace('/dashboard');
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    saleFlowBridge.clear();
  }, []);

  React.useEffect(() => {
    if (!isValid || hasSavedRef.current) return;
    hasSavedRef.current = true;

    const runSave = async () => {
      // Ensure session is fresh before making backend calls
      try {
        await supabase.auth.refreshSession();
      } catch (e) {
        console.error('Session refresh failed:', e);
      }

      // Try to get invoice number from backend first; fallback to local
      let finalInvoiceNumber = invoiceNumber;
      const nextResult = await getNextInvoiceNumber();
      if (nextResult.success && nextResult.invoiceNumber) {
        finalInvoiceNumber = nextResult.invoiceNumber;
        setInvoiceNumber(finalInvoiceNumber);
      }

      // Save customer to backend if new
      let customerId = payment.customer.id;
      if (!customerId || customerId.startsWith('CUST_')) {
        try {
          const custResult = await createCustomer({
            name: payment.customer.name,
            businessName: payment.customer.businessName || undefined,
            customerType: payment.customer.isBusinessCustomer ? 'business' : 'individual',
            mobile: payment.customer.mobile,
            email: payment.customer.email || undefined,
            gstin: payment.customer.gstin || undefined,
            address: payment.customer.address || payment.customer.businessAddress || undefined,
            paymentTerms: payment.customer.paymentTerms || undefined,
          });
          if (custResult.success && custResult.customer?.id) {
            customerId = custResult.customer.id;
          }
        } catch (e) {
          console.error('Customer save failed:', e);
        }
      }

      // Create sale data
      const saleItems: SaleItem[] = payment.cartItems.map((item: any) => {
        const effectivePrice = getUoMPrice(item);
        const lineTotal = effectivePrice * item.quantity;
        const taxRate = item.taxRate || 0;
        const isTaxInclusive = item.taxInclusive === true;

        let taxableAmount: number;
        let taxAmount: number;
        if (isTaxInclusive && taxRate > 0) {
          taxableAmount = lineTotal / (1 + taxRate / 100);
          taxAmount = lineTotal - taxableAmount;
        } else {
          taxableAmount = lineTotal;
          taxAmount = lineTotal * (taxRate / 100);
        }

        return {
          productId: item.productDbId || item.id || `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: isTaxInclusive ? +(taxableAmount / item.quantity).toFixed(2) : effectivePrice,
          totalPrice: +taxableAmount.toFixed(2),
          taxRate,
          taxAmount: +taxAmount.toFixed(2),
          taxInclusive: isTaxInclusive,
          cessType: item.cessType || 'none',
          cessRate: item.cessRate || 0,
          cessAmount: item.cessAmount ?? 0,
          hsnCode: item.hsnCode || item.category,
          batchNumber: item.batchNumber,
          primaryUnit: getUoMUnit(item),
        };
      });

      const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmountTotal = saleItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const cessAmountTotal = saleItems.reduce((sum, item) => sum + (item.cessAmount ?? 0), 0);
      const roundOffAmount = payment.roundOffAmount || 0;
      const totalAmount = subtotal + taxAmountTotal + cessAmountTotal + roundOffAmount;

      // Determine actual paid amount based on payment type
      let paidAmount = totalAmount;
      let balanceAmount = 0;
      if (payment.paymentType === 'add_to_receivables') {
        paidAmount = payment.cashAmount || 0;
        balanceAmount = totalAmount - paidAmount;
      } else if (payment.paymentType === 'part_payment') {
        paidAmount = payment.cashAmount || 0;
        balanceAmount = totalAmount - paidAmount;
      } else {
        paidAmount = totalAmount;
        balanceAmount = 0;
      }

      const sale: Sale = {
        id: `SALE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: finalInvoiceNumber,
        customerId: customerId || `CUST_${Date.now()}`,
        customerName: payment.customer.name,
        customerType: payment.customer.customerType || (payment.customer.isBusinessCustomer ? 'business' : 'individual'),
        items: saleItems,
        subtotal: subtotal,
        taxAmount: taxAmountTotal,
        cessAmount: cessAmountTotal,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: balanceAmount,
        paymentMethod: payment.method,
        othersMethod: payment.othersMethod,
        saleDate: new Date().toISOString(),
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      // Create invoice in backend
      const paymentStatus: 'paid' | 'partial' | 'unpaid' =
        paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
      const paymentMethodStr =
        payment.method === 'others' ? (payment.othersMethod || 'others') : payment.method;

      const createResult = await createInvoice({
        invoiceNumber: finalInvoiceNumber,
        customerId: customerId || undefined,
        customerName: payment.customer.name,
        customerType: payment.customer.customerType || (payment.customer.isBusinessCustomer ? 'business' : 'individual'),
        items: saleItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          taxInclusive: (item as any).taxInclusive || false,
          cessType: item.cessType,
          cessRate: item.cessRate,
          cessAmount: item.cessAmount,
          hsnCode: item.hsnCode,
          batchNumber: item.batchNumber,
          primaryUnit: item.primaryUnit,
          discountType: (payment.cartItems as any[]).find((c: any) => c.name === item.productName)?.discountType,
          discountValue: (payment.cartItems as any[]).find((c: any) => c.name === item.productName)?.discountValue,
        })),
        subtotal,
        taxAmount: taxAmountTotal,
        cessAmount: cessAmountTotal,
        roundOffAmount,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentMethod: paymentMethodStr,
        paymentStatus,
        invoiceDate: new Date().toISOString(),
        staffId: staffId || undefined,
        staffName: staffName || undefined,
        invoiceExtras: invoiceExtrasRef.current,
        bankAccountId: payment.bankAccount || undefined,
        chequeDetails: payment.chequeDetails || undefined,
        bankTransferReference: payment.bankTransferReference || undefined,
      });
      if (!createResult.success) {
        console.error('Backend createInvoice failed:', createResult.error);
      }

      if (createResult.success && isStaff && staffId && staffBusinessId) {
        createInAppNotification({
          businessId: staffBusinessId,
          recipientId: 'owner',
          recipientType: 'owner',
          title: `New Sale by ${staffName || 'Staff'}`,
          message: `Invoice ${finalInvoiceNumber} - ${formatCurrencyINR(totalAmount)}`,
          type: 'info',
          category: 'sale',
          sourceStaffId: staffId,
          sourceStaffName: staffName || undefined,
          relatedEntityType: 'invoice',
          relatedEntityId: createResult.invoice?.id,
        }).catch(() => {});
      }

      if (createResult.success) {
        createdInvoiceIdRef.current = createResult.invoice?.id;
      }
    };

    runSave();
  }, []);

  const formatAmount = (amount: number) => {
    return formatCurrencyINR(amount);
  };

  const applyRoundOff = (amount: number) => {
    const decimalPart = amount % 1;
    if (decimalPart < 0.50) {
      return Math.floor(amount); // Round down to nearest whole number
    } else {
      return Math.ceil(amount); // Round up to nearest whole number
    }
  };

  const getPaymentMethodText = () => {
    switch (payment.method) {
      case 'cash':
        return 'Cash Payment';
      case 'upi':
        return 'UPI Payment';
      case 'card':
        return 'Card Payment';
      case 'others':
        return payment.othersMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cheque Payment';
      default:
        return 'Payment';
    }
  };

  const buildSalePDFData = (): InvoicePDFData => {
    const customer = payment?.customer;
    const items = payment?.cartItems || [];
    const invoiceExtras = invoiceExtrasRef.current;
    const bizAddr = businessData?.addresses?.[0];
    const bizAddress = bizAddr ? [bizAddr.door_number || bizAddr.doorNumber, bizAddr.address_line_1 || bizAddr.addressLine1, bizAddr.address_line_2 || bizAddr.addressLine2, bizAddr.city, bizAddr.state || bizAddr.stateName, bizAddr.pincode].filter(Boolean).join(', ') : '';
    const bank = businessData?.bankAccounts?.[0];
    return {
      type: 'sale',
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      business: {
        name: businessData?.business?.legal_name || businessData?.business?.owner_name || '',
        address: bizAddress,
        gstin: businessData?.business?.tax_id || '',
        phone: businessData?.business?.phone,
      },
      customer: customer ? {
        name: customer.name || '',
        address: customer.address || customer.businessAddress,
        gstin: customer.gstin,
        phone: customer.mobile,
        businessName: customer.businessName,
        isBusinessCustomer: customer.isBusinessCustomer,
      } : undefined,
      items: items.map((item: any) => ({
        name: item.name || item.productName || '',
        hsnCode: item.hsnCode || item.hsn_code,
        quantity: Number(item.quantity) || 1,
        unit: getUoMUnit(item),
        rate: Number(getUoMPrice(item) || item.sellingPrice || item.rate) || 0,
        discount: Number(item.discount) || 0,
        taxRate: Number(item.gstRate || item.taxRate) || 0,
        taxAmount: Number(item.taxAmount || item.gstAmount) || 0,
        cessAmount: Number(item.cessAmount) || 0,
        total: Number(item.totalWithTax || item.total || item.lineTotal) || 0,
      })),
      subtotal: items.reduce((s: number, i: any) => s + (Number(i.lineTotal || i.total || 0)), 0),
      taxAmount: items.reduce((s: number, i: any) => s + (Number(i.gstAmount || i.taxAmount || 0)), 0),
      totalAmount: Number(payment?.total || payment?.amount) || 0,
      paidAmount: Number(payment?.total || payment?.amount) || 0,
      paymentMethod: payment?.method,
      paymentStatus: 'paid',
      invoiceExtras,
      invoiceId: createdInvoiceIdRef.current,
      businessId: businessData?.business?.id,
      bankDetails: bank ? { bankName: bank.bank_name || bank.bankName || '', accountNo: bank.account_number || bank.accountNumber || '', ifsc: bank.ifsc_code || bank.ifscCode || '', branch: bank.branch || '' } : undefined,
    };
  };

  const handleDownloadInvoice = async () => {
    try {
      const pdfData = buildSalePDFData();
      const fileUri = await generateInvoicePDF(pdfData);
      await shareInvoicePDF(fileUri, invoiceNumber);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not generate PDF');
    }
  };

  const handleShareInvoice = () => {
    const pdfData = buildSalePDFData();
    showShareOptions({
      invoiceNumber,
      invoiceId: createdInvoiceIdRef.current,
      businessId: businessData?.business?.id,
      invoiceType: 'sale',
      invoicePdfData: pdfData,
    });
  };

  const handlePrintInvoice = async () => {
    try {
      const pdfData = buildSalePDFData();
      await printInvoice(pdfData);
    } catch (error: any) {
      Alert.alert('Print Failed', error.message || 'Could not print invoice');
    }
  };

  const handleViewInvoice = () => {
    setShowInvoice(true);
  };

  const handleNewSale = () => {
    safeRouter.push('/new-sale');
  };

  const handleGoToDashboard = () => {
    safeRouter.replace('/dashboard');
  };

  if (!isValid) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => safeRouter.replace('/dashboard')}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle}>← Dashboard</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Invalid Payment Data</Text>
          <Text style={styles.errorMessage}>
            The payment data is missing or invalid. Please return to the dashboard and try again.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => safeRouter.replace('/dashboard')}
            activeOpacity={0.7}
          >
            <Text style={styles.errorButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconWrapper}>
              <CheckCircle size={64} color={Colors.success} />
            </View>
          </View>

          {/* Success Message */}
          <View style={styles.successMessageContainer}>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your sale has been completed successfully
            </Text>
          </View>

          {/* Invoice Details */}
          <View style={styles.invoiceDetailsContainer}>
            <Text style={styles.invoiceNumber}>Invoice #{invoiceNumber}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{payment.customer.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mobile:</Text>
                <Text style={styles.detailValue}>{payment.customer.mobile}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{getPaymentMethodText()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {formatAmount(payment.amount || payment.total || 0)}
                </Text>
              </View>

              {payment.method === 'cash' && (payment.balance || 0) > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance Returned:</Text>
                  <Text style={[styles.detailValue, styles.balanceValue]}>
                    {formatAmount(payment.balance || 0)}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewInvoice}
              activeOpacity={0.7}
            >
              <FileText size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>View Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadInvoice}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareInvoice}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintInvoice}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.newSaleButton}
              onPress={handleNewSale}
              activeOpacity={0.8}
            >
              <ShoppingCart size={20} color="#ffffff" />
              <Text style={styles.newSaleButtonText}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={handleGoToDashboard}
              activeOpacity={0.8}
            >
              <Home size={20} color={Colors.primary} />
              <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Invoice Modal */}
      <Modal
        visible={showInvoice}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInvoice(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tax Invoice</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInvoice(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Invoice Title */}
              <View style={styles.invoiceTitleSection}>
                <Text style={styles.invoiceTitle}>Tax Invoice</Text>
                <Text style={styles.invoiceNumberText}>Invoice #{invoiceNumber}</Text>
                <Text style={styles.invoiceDateTime}>
                  Date: {new Date().toLocaleDateString('en-IN')} | Time: {new Date().toLocaleTimeString('en-IN')}
                </Text>
              </View>

              {/* Business Details */}
              <View style={styles.businessSection}>
                <Text style={styles.sectionTitle}>Business Details:</Text>
                <Text style={styles.companyName}>{businessData?.legal_name || ''}</Text>
                {businessData?.address ? <Text style={styles.companyAddress}>{businessData.address}</Text> : null}
                {businessData?.tax_id ? <Text style={styles.companyGSTIN}>GSTIN: {businessData.tax_id}</Text> : null}
              </View>

              {/* Customer Details */}
              <View style={styles.customerSection}>
                <Text style={styles.sectionTitle}>
                  {payment.customer.isBusinessCustomer ? 'Business Details:' : 'Customer Details:'}
                </Text>
                {payment.customer.isBusinessCustomer ? (
                  <>
                    <Text style={styles.customerName}>{payment.customer.businessName || payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Contact: {payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Mobile: {payment.customer.mobile}</Text>
                    {payment.customer.gstin && (
                      <Text style={styles.customerGSTIN}>GSTIN: {payment.customer.gstin}</Text>
                    )}
                    {payment.customer.paymentTerms && (
                      <Text style={styles.customerPaymentTerms}>Payment Terms: {payment.customer.paymentTerms}</Text>
                    )}
                    
                    {/* Bill-to Address */}
                    <Text style={styles.addressLabel}>Bill-to Address:</Text>
                    <Text style={styles.customerAddress}>
                      {payment.customer.businessAddress || payment.customer.address}
                    </Text>
                    
                    {/* Ship-to Address (if different) */}
                    {payment.customer.shipToAddress && 
                     payment.customer.shipToAddress.trim() !== '' && 
                     payment.customer.shipToAddress !== payment.customer.businessAddress && (
                      <>
                        <Text style={styles.addressLabel}>Ship-to Address:</Text>
                        <Text style={styles.customerAddress}>
                          {payment.customer.shipToAddress}
                        </Text>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.customerName}>{payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Mobile: {payment.customer.mobile}</Text>
                    <Text style={styles.customerAddress}>{payment.customer.address}</Text>
                  </>
                )}
              </View>

              {/* Items Table */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items:</Text>
                
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.srColumn]}>Sr No</Text>
                  <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item Name & HSN Code</Text>
                  <Text style={[styles.tableHeaderText, styles.detailsColumn]}>Quantity, Rate & Amount</Text>
                </View>

                {/* Table Rows */}
                {payment.cartItems.map((item: any, index: number) => {
                  const effectivePrice = getUoMPrice(item);
                  const effectiveUnit = getUoMUnit(item);
                  const itemTotal = effectivePrice * item.quantity;
                  let basePrice = itemTotal;
                  
                  if (item.discountValue && item.discountValue > 0) {
                    if (item.discountType === 'percentage') {
                      basePrice = basePrice * (1 - item.discountValue / 100);
                    } else {
                      basePrice = basePrice - item.discountValue;
                    }
                  }
                  
                  const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                  
                  let cessAmount = 0;
                  if (item.cessType && item.cessType !== 'none') {
                    if (item.cessType === 'value') {
                      cessAmount = basePrice * ((item.cessRate || 0) / 100);
                    } else if (item.cessType === 'quantity') {
                      cessAmount = (item.cessAmount || 0) * item.quantity;
                    } else if (item.cessType === 'value_and_quantity') {
                      const valueCess = basePrice * ((item.cessRate || 0) / 100);
                      const quantityCess = (item.cessAmount || 0) * item.quantity;
                      cessAmount = valueCess + quantityCess;
                    }
                  }
                  
                  const itemGrandTotal = basePrice + taxAmount + cessAmount;
                  
                  return (
                    <View key={index} style={styles.tableRow}>
                      <View style={[styles.srColumn]}>
                        <Text style={styles.srNumber}>{index + 1}</Text>
                      </View>
                      <View style={[styles.itemColumn]}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemHSN}>HSN: {item.hsnCode || item.category}</Text>
                      </View>
                      <View style={[styles.detailsColumn]}>
                        <Text style={styles.itemDetails}>
                          {item.quantity} × {formatAmount(effectivePrice)} per {effectiveUnit}
                        </Text>
                        <Text style={styles.itemAmount}>
                          Amount: {formatAmount(applyRoundOff(itemTotal))}
                        </Text>
                        {item.taxRate && item.taxRate > 0 && (
                          <Text style={styles.itemTax}>
                            GST ({item.taxRate}%): {formatAmount(applyRoundOff(taxAmount))}
                          </Text>
                        )}
                        {item.cessType && item.cessType !== 'none' && (
                          <Text style={styles.itemCess}>
                            CESS: {formatAmount(applyRoundOff(cessAmount))}
                          </Text>
                        )}
                        <Text style={styles.itemTotal}>
                          Total: {formatAmount(applyRoundOff(itemGrandTotal))}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>



              {/* Invoice Totals */}
              <View style={styles.totalsSection}>
                <Text style={styles.totalsTitle}>Invoice Summary</Text>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Invoice Total:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = getUoMPrice(item) * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + basePrice + taxAmount + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Whole Invoice GST Amount:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = getUoMPrice(item) * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      return total + (basePrice * ((item.taxRate || 0) / 100));
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Whole Invoice CESS Total:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = getUoMPrice(item) * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount (if any):</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(0))} {/* Add discount calculation if available */}
                  </Text>
                </View>
                
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Invoice Total:</Text>
                  <Text style={styles.grandTotalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = getUoMPrice(item) * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + basePrice + taxAmount + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Method:</Text>
                <Text style={styles.paymentMethod}>{getPaymentMethodText()}</Text>
                              {payment.method === 'cash' && (payment.balance || 0) > 0 && (
                <Text style={styles.paymentBalance}>Balance Returned: {formatAmount(payment.balance || 0)}</Text>
              )}
              </View>

              {/* Thank You Note */}
              <View style={styles.thankYouSection}>
                <Text style={styles.thankYouText}>Thank you for your business!</Text>
                <Text style={styles.thankYouSubtext}>This is a computer generated invoice</Text>
              </View>
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  invoiceDetailsContainer: {
    width: '100%',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 16,
    color: Colors.success,
  },
  balanceValue: {
    color: Colors.warning,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  navigationContainer: {
    width: '100%',
    gap: 12,
  },
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  newSaleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dashboardButtonText: {
    color: '#3f66ac',
    fontSize: 16,
    fontWeight: '600',
  },
  // Invoice Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  invoiceTitleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  invoiceNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  invoiceDateTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  businessSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  companyGSTIN: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  invoiceInfo: {
    alignItems: 'flex-end',
  },
  invoiceDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  invoiceTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  customerSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  customerMobile: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  customerGSTIN: {
    fontSize: 12,
    color: Colors.textLight,
  },
  customerPaymentTerms: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  taxBreakdownSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  taxAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  taxDetails: {
    marginLeft: 16,
    marginBottom: 12,
  },
  taxDetailRow: {
    marginBottom: 4,
  },
  taxDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  taxDetailText: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 14,
  },
  itemsSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    alignItems: 'flex-start',
  },
  tableCell: {
    // Layout styles for View components
  },
  srColumn: {
    flex: 0.5,
    alignItems: 'center',
  },
  itemColumn: {
    flex: 2,
  },
  detailsColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  itemHSN: {
    fontSize: 9,
    color: Colors.textLight,
  },
  srNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  itemDetails: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemAmount: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 3,
  },
  itemTax: {
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 3,
  },
  itemCess: {
    fontSize: 11,
    color: Colors.warning,
    marginBottom: 3,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
  },
  totalsSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[300],
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  grandTotalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  paymentBalance: {
    fontSize: 12,
    color: Colors.warning,
  },
  invoiceFooter: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  footerText: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 2,
  },
  thankYouSection: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 4,
  },
  thankYouSubtext: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  
  // Header Styles for Error Display
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
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
  
  // Error Display Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  errorButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});