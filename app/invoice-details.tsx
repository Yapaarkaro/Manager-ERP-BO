import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { dataStore } from '@/utils/dataStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Printer,
  FileText,
  Calendar,
  Hash,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Package,
  IndianRupee
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export default function InvoiceDetailsScreen() {
  const { invoiceId, invoiceData } = useLocalSearchParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('InvoiceDetailsScreen rendered with invoiceId:', invoiceId);
  console.log('Type of invoiceId:', typeof invoiceId);
  console.log('Invoice data from params:', invoiceData);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = () => {
    try {
      setIsLoading(true);
      
      console.log('Loading invoice data for ID:', invoiceId);
      console.log('Invoice data from params:', invoiceData);
      
      // First try to use the passed invoiceData parameter
      if (invoiceData) {
        try {
          const parsedInvoiceData = JSON.parse(invoiceData as string);
          console.log('Parsed invoice data:', parsedInvoiceData);
          
          // Set the invoice from the passed data
          setInvoice(parsedInvoiceData);
          
          // Create customer object from the invoice data
          const customerFromInvoice = {
            id: parsedInvoiceData.id || 'unknown',
            name: parsedInvoiceData.customerName || 'Unknown Customer',
            customerType: parsedInvoiceData.customerType || 'business',
            contactPerson: parsedInvoiceData.customerDetails?.name || 'N/A',
            mobile: parsedInvoiceData.customerDetails?.mobile || 'N/A',
            email: 'N/A',
            address: parsedInvoiceData.customerDetails?.address || 'N/A',
            avatar: '👤',
            customerScore: 0,
            onTimePayment: 0,
            satisfactionRating: 0,
            responseTime: 0,
            totalOrders: 0,
            completedOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
            totalValue: 0,
            averageOrderValue: 0,
            returnRate: 0,
            lastOrderDate: null,
            joinedDate: new Date().toISOString(),
            status: 'active',
            createdAt: new Date().toISOString()
          };
          
          setCustomer(customerFromInvoice);
          setIsBusinessCustomer(customerFromInvoice.customerType === 'business');
          console.log('Invoice and customer set from passed data');
          
        } catch (parseError) {
          console.error('Error parsing invoice data:', parseError);
          // Fall back to dataStore loading
          loadFromDataStore();
        }
      } else {
        // Fall back to dataStore loading
        loadFromDataStore();
      }
    } catch (error) {
      console.error('Error loading invoice data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadFromDataStore = () => {
    console.log('Loading from dataStore...');
    
    // Get invoice from dataStore
    const allInvoices = dataStore.getInvoices();
    console.log('All invoices from dataStore:', allInvoices.length);
    console.log('Invoice IDs:', allInvoices.map(inv => inv.id));
    
    const foundInvoice = allInvoices.find(inv => inv.id === invoiceId);
    console.log('Found invoice in dataStore:', foundInvoice);
    
    if (foundInvoice) {
      setInvoice(foundInvoice);
      console.log('Invoice set from dataStore:', foundInvoice);
      
      // Get customer details
      if (foundInvoice.customerId) {
        console.log('Looking for customer with ID:', foundInvoice.customerId);
        const customerData = dataStore.getCustomerById(foundInvoice.customerId);
        console.log('Found customer:', customerData);
        
        if (customerData) {
          setCustomer(customerData);
          setIsBusinessCustomer(customerData.customerType === 'business');
          console.log('Customer set successfully');
        } else {
          console.log('Customer not found for ID:', foundInvoice.customerId);
          // Set a fallback customer object
          setCustomer({
            id: foundInvoice.customerId,
            name: foundInvoice.customerName || 'Unknown Customer',
            customerType: foundInvoice.customerType || 'business',
            contactPerson: 'N/A',
            mobile: 'N/A',
            email: 'N/A',
            address: 'N/A',
            avatar: '👤',
            customerScore: 0,
            onTimePayment: 0,
            satisfactionRating: 0,
            responseTime: 0,
            totalOrders: 0,
            completedOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
            totalValue: 0,
            averageOrderValue: 0,
            returnRate: 0,
            lastOrderDate: null,
            joinedDate: new Date().toISOString(),
            status: 'active',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        console.log('No customerId in invoice');
        // Set a fallback customer object
        setCustomer({
          id: 'unknown',
          name: foundInvoice.customerName || 'Unknown Customer',
          customerType: foundInvoice.customerType || 'business',
          contactPerson: 'N/A',
          mobile: 'N/A',
          email: 'N/A',
          address: 'N/A',
          avatar: '👤',
          customerScore: 0,
          onTimePayment: 0,
          satisfactionRating: 0,
          responseTime: 0,
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          totalValue: 0,
          averageOrderValue: 0,
          returnRate: 0,
          lastOrderDate: null,
          joinedDate: new Date().toISOString(),
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      console.log('Invoice not found in dataStore for ID:', invoiceId);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading Invoice...</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading invoice details...</Text>
        </View>
      </View>
    );
  }

  // Show error state if invoice not found
  if (!invoice) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invoice Not Found</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invoice not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInvoiceData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get invoice items from the invoice data
  const invoiceItems: InvoiceItem[] = invoice.items || [
    {
      id: `fallback-item-${Date.now()}`,
      name: 'Sample Item',
      quantity: 1,
      rate: invoice.totalAmount || 0,
      amount: invoice.totalAmount || 0,
      taxRate: 18,
      taxAmount: 0,
      total: invoice.totalAmount || 0
    }
  ];

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
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

  const handleDownload = async () => {
    try {
              console.log('Starting download for invoice:', invoice.invoiceNumber || 'Unknown');
      
      // Generate HTML content for the invoice
      const htmlContent = generateInvoiceHTML();
      
      // Create a temporary HTML file
      const fileName = `Invoice_${invoice.invoiceNumber || 'Unknown'}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('File URI:', fileUri);
      
      // Write HTML content to file
      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('File written successfully');
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing is available, opening share dialog');
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: `Invoice ${invoice.invoiceNumber || 'Unknown'}`,
        });
      } else {
        console.log('Sharing not available, showing success alert');
        Alert.alert(
          'Download Successful',
          `Invoice saved as ${fileName}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', `Error generating invoice file: ${error.message}`);
    }
  };

  const generateInvoiceHTML = () => {
    const itemsHTML = invoiceItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(item.rate)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(item.amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.taxRate}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(item.taxAmount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(item.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.invoiceNumber || 'Unknown'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: white;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #3f66ac;
              padding-bottom: 20px;
            }
            .invoice-title { 
              font-size: 28px; 
              font-weight: bold; 
              color: #3f66ac; 
              margin-bottom: 10px;
            }
            .invoice-number {
              font-size: 18px;
              color: #666;
              font-weight: 600;
            }
            .invoice-info { 
              margin-bottom: 20px; 
              display: flex;
              justify-content: space-between;
            }
            .info-section {
              flex: 1;
            }
            .customer-info { 
              margin-bottom: 20px; 
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              border: 1px solid #ddd;
            }
            th { 
              background-color: #3f66ac; 
              color: white;
              padding: 12px; 
              text-align: left; 
              font-weight: bold; 
            }
            td { 
              padding: 10px; 
              border-bottom: 1px solid #eee;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .summary { 
              margin-top: 20px; 
              background-color: #f0fdf4;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #059669;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .total { 
              font-weight: bold; 
              font-size: 20px; 
              color: #059669; 
              border-top: 2px solid #059669;
              padding-top: 10px;
              margin-top: 10px;
            }
            .business-details {
              background-color: #f0f4ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border: 1px solid #3f66ac;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="invoice-number">Invoice No: ${invoice.invoiceNumber || 'Unknown'}</div>
          </div>
          
          <div class="invoice-info">
            <div class="info-section">
              <p><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
              <p><strong>Payment Status:</strong> ${invoice.status || 'Paid'}</p>
            </div>
            <div class="info-section">
              <p><strong>Staff:</strong> N/A</p>
              <p><strong>Items:</strong> ${invoiceItems.length}</p>
            </div>
          </div>
          
          <div class="business-details">
            <h3>Business Details</h3>
            <p><strong>ABC Electronics Pvt Ltd</strong></p>
            <p>123 Business Street, Tech City - 560001</p>
            <p>GSTIN: 29ABCDE1234F1Z5</p>
            <p>Phone: +91 98765 43210</p>
          </div>
          
          <div class="customer-info">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${customer.name}</p>
            <p><strong>Address:</strong> ${customer.address}</p>
            <p><strong>Phone:</strong> ${customer.mobile}</p>
            <p><strong>Type:</strong> ${isBusinessCustomer ? 'Business' : 'Individual'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Tax %</th>
                <th>Tax Amount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span><strong>Subtotal:</strong></span>
              <span>${formatAmount(subtotal)}</span>
            </div>
            <div class="summary-row">
              <span><strong>Total Tax:</strong></span>
              <span>${formatAmount(totalTax)}</span>
            </div>
            <div class="summary-row total">
              <span><strong>Grand Total:</strong></span>
              <span><strong>${formatAmount(grandTotal)}</strong></span>
            </div>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Thank you for your business!</p>
            <p>This is a computer generated invoice.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleShare = () => {
    Alert.alert('Share', 'Invoice sharing functionality will be implemented');
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Invoice printing functionality will be implemented');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Tax Invoice - {invoice.invoiceNumber || 'N/A'}</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tax Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.taxInvoiceSection}>
            <FileText size={32} color={Colors.primary} />
            <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>
          </View>
          
          <View style={styles.invoiceMetaInfo}>
            <View style={styles.metaRow}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.invoiceDate)}</Text>
            </View>
          </View>
        </View>

        {/* IRN & Acknowledgment Section */}
        <View style={styles.irnSection}>
          <Text style={styles.sectionTitle}>E-Invoice Details</Text>
          
          <View style={styles.irnCard}>
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>IRN (Invoice Reference Number):</Text>
              <Text style={styles.irnValue}>
                01234567890123456789012345678901234567890123456789012345678901234
              </Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Number:</Text>
              <Text style={styles.irnValue}>112410600000685</Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Date:</Text>
              <Text style={styles.irnValue}>{formatDate(invoice.invoiceDate)} 14:30:25</Text>
            </View>
          </View>
        </View>

        {/* Business Details */}
        <View style={styles.businessSection}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.businessCard}>
            <View style={styles.businessHeader}>
              <Building2 size={24} color={Colors.primary} />
              <Text style={styles.businessName}>ABC Electronics Pvt Ltd</Text>
            </View>
            
            <View style={styles.businessDetails}>
              <View style={styles.businessRow}>
                <MapPin size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>
                  123, Electronic City, Phase 1, Bangalore, Karnataka - 560100
                </Text>
              </View>
              
              <View style={styles.businessRow}>
                <Hash size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>GSTIN: 29ABCDE1234F1Z5</Text>
              </View>
              
              <View style={styles.businessRow}>
                <Phone size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>+91 80 1234 5678</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          
          <View style={styles.customerCard}>
            <Text style={styles.customerName}>
              {isBusinessCustomer ? customer.businessName : customer.name}
            </Text>
            {isBusinessCustomer && customer.gstin && (
              <Text style={styles.customerGstin}>GSTIN: {customer.gstin}</Text>
            )}
            {!isBusinessCustomer && (
              <Text style={styles.contactPerson}>Contact: {customer.name}</Text>
            )}
            <Text style={styles.customerDetails}>
              Mobile: {customer.mobile}{'\n'}
              Address: {customer.address}
            </Text>
            {isBusinessCustomer && customer.paymentTerms && (
              <View style={styles.paymentTermsSection}>
                <Text style={styles.paymentTermsLabel}>Payment Terms:</Text>
                <Text style={styles.paymentTermsValue}>{customer.paymentTerms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Ship To Address (only for business customers with different shipping address) */}
        {isBusinessCustomer && customer.shipToAddress && customer.shipToAddress.trim() !== '' && customer.shipToAddress !== customer.address && (
          <View style={styles.shipToSection}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            
            <View style={styles.shipToCard}>
              <Text style={styles.shipToName}>
                {customer.businessName}
              </Text>
              <Text style={styles.shipToDetails}>
                Address: {customer.shipToAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Invoice Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          
          <View style={styles.itemsTable}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
            </View>
            
            {/* Table Rows */}
            {invoiceItems.map((item, index) => (
              <View key={item.id || `item-${index}`} style={styles.tableRow}>
                <View style={styles.itemNameCell}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTax}>GST @ {item.taxRate}%</Text>
                </View>
                <Text style={[styles.tableCellText, styles.qtyCell]}>{item.quantity}</Text>
                <Text style={[styles.tableCellText, styles.rateCell]}>
                  {formatAmount(item.rate)}
                </Text>
                <Text style={[styles.tableCellText, styles.amountCell]}>
                  {formatAmount(item.total)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <CreditCard size={20} color={Colors.success} />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethod}>Cash Payment</Text>
                <Text style={styles.paymentStatus}>Paid</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatAmount(grandTotal)}</Text>
            </View>
            
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailText}>
                Payment received on {formatDate(invoice.invoiceDate)} at 14:30
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionTitle}>Processed By</Text>
          
          <View style={styles.staffCard}>
            <Text style={styles.staffName}>N/A</Text>
            <Text style={styles.staffRole}>Sales Executive</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    height: '85%', // Reduce height to avoid camera notch
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced padding
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
    maxHeight: '85%', // Limit scroll view height
  },
  scrollContent: {
    padding: 12, // Reduced padding
  },
  invoiceHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16, // Reduced padding
    marginBottom: 12, // Reduced margin
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  taxInvoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // Reduced margin
    paddingBottom: 12, // Reduced padding
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  taxInvoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 12,
  },
  invoiceMetaInfo: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  irnSection: {
    marginBottom: 12, // Reduced margin
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  irnCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  irnRow: {
    marginBottom: 12,
  },
  irnLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  irnValue: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  businessSection: {
    marginBottom: 16,
  },
  businessCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  businessDetails: {
    gap: 8,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  businessText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
  },
  customerSection: {
    marginBottom: 12, // Reduced margin
  },
  customerCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  customerGstin: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  customerDetails: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  paymentTermsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  paymentTermsLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 8,
  },
  paymentTermsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
  },
  shipToSection: {
    marginBottom: 16,
  },
  shipToCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  shipToName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  shipToDetails: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  itemsSection: {
    marginBottom: 12, // Reduced margin
  },
  itemsTable: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  itemNameHeader: {
    flex: 2,
  },
  qtyHeader: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  itemTax: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tableCellText: {
    fontSize: 14,
    color: Colors.text,
  },
  qtyCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateCell: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 12, // Reduced margin
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6, // Reduced padding
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentSection: {
    marginBottom: 12, // Reduced margin
  },
  paymentCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.success,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.success,
  },
  paymentDetailText: {
    fontSize: 12,
    color: Colors.success,
    fontStyle: 'italic',
  },
  staffSection: {
    marginBottom: 12, // Reduced margin
  },
  staffCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.grey[200],
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
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});