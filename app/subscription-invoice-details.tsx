import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
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
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock
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
  secondary: '#FFC754',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface SubscriptionInvoiceItem {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: string;
}

export default function SubscriptionInvoiceDetailsScreen() {
  const { invoiceId, invoiceData } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const customer = invoice.customerDetails;
  const isBusinessCustomer = invoice.customerType === 'business';

  // Debug: Log invoice data to ensure it's correct
  console.log('Subscription Invoice Details Screen - Invoice Data:', {
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    subscriptionName: invoice.subscriptionName,
    amount: invoice.amount
  });

  // Mock subscription invoice items
  const invoiceItems: SubscriptionInvoiceItem[] = [
    {
      id: '1',
      name: invoice.subscriptionName,
      description: invoice.description,
      amount: invoice.amount,
      type: invoice.subscriptionType
    }
  ];

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = subtotal;

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
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <Clock size={16} color={Colors.primary} />;
      case 'paid':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'failed':
        return <XCircle size={16} color={Colors.error} />;
      default:
        return <Clock size={16} color={Colors.textLight} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return Colors.primary;
      case 'paid':
        return Colors.success;
      case 'failed':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'subscription':
        return Colors.primary;
      case 'addon':
        return Colors.secondary;
      case 'marketing':
        return Colors.warning;
      default:
        return Colors.textLight;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'ERP Plan';
      case 'addon':
        return 'Add-on Service';
      case 'marketing':
        return 'Marketing Service';
      default:
        return 'Service';
    }
  };

  const handleDownload = async () => {
    try {
      // Mock download functionality
      Alert.alert('Download', 'Invoice download started...');
    } catch (error) {
      Alert.alert('Error', 'Failed to download invoice');
    }
  };

  const handleShare = async () => {
    try {
      // Mock share functionality
      Alert.alert('Share', 'Invoice sharing...');
    } catch (error) {
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Printing invoice...');
  };

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
        
        <Text style={styles.headerTitle}>Invoice Details</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <Download size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePrint}
            activeOpacity={0.7}
          >
            <Printer size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <View style={styles.invoiceNumberRow}>
              <Hash size={20} color={Colors.primary} />
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            </View>
            <Text style={styles.invoiceDate}>
              {formatDate(invoice.startDate)} - {formatDate(invoice.endDate)}
            </Text>
            <View style={styles.statusRow}>
              {getStatusIcon(invoice.status)}
              <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.invoiceAmount}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>{formatAmount(invoice.amount)}</Text>
            <View style={[
              styles.typeBadge,
              { backgroundColor: getTypeBadgeColor(invoice.subscriptionType) + '15' }
            ]}>
              <Text style={[
                styles.typeText,
                { color: getTypeBadgeColor(invoice.subscriptionType) }
              ]}>
                {getTypeLabel(invoice.subscriptionType)}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              {isBusinessCustomer ? (
                <Building2 size={20} color={Colors.primary} />
              ) : (
                <FileText size={20} color={Colors.primary} />
              )}
              <Text style={styles.customerName}>{customer.name}</Text>
            </View>
            <Text style={styles.customerBusiness}>{customer.businessName}</Text>
            <View style={styles.customerDetails}>
              <View style={styles.customerDetail}>
                <Phone size={16} color={Colors.textLight} />
                <Text style={styles.customerDetailText}>{customer.mobile}</Text>
              </View>
              <View style={styles.customerDetail}>
                <MapPin size={16} color={Colors.textLight} />
                <Text style={styles.customerDetailText}>{customer.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionName}>{invoice.subscriptionName}</Text>
            <Text style={styles.subscriptionDescription}>{invoice.description}</Text>
            <View style={styles.subscriptionPeriod}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.periodText}>
                Period: {formatDate(invoice.startDate)} - {formatDate(invoice.endDate)}
              </Text>
            </View>
            {invoice.nextBilling && (
              <View style={styles.nextBilling}>
                <Calendar size={16} color={Colors.primary} />
                <Text style={styles.nextBillingText}>
                  Next Billing: {formatDate(invoice.nextBilling)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <View style={styles.itemsContainer}>
            {invoiceItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <View style={[
                    styles.itemTypeBadge,
                    { backgroundColor: getTypeBadgeColor(item.type) + '15' }
                  ]}>
                    <Text style={[
                      styles.itemTypeText,
                      { color: getTypeBadgeColor(item.type) }
                    ]}>
                      {getTypeLabel(item.type)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemAmount}>{formatAmount(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features List */}
        {invoice.features && invoice.features.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features Included</Text>
            <View style={styles.featuresContainer}>
              {invoice.features.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <Package size={16} color={Colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatAmount(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>
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
    padding: 8,
    marginRight: 8,
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
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
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
  customerCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  customerBusiness: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
  },
  customerDetails: {
    gap: 8,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerDetailText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  subscriptionCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  subscriptionPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  periodText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  nextBilling: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextBillingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  itemsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  itemTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  featuresContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
  },
  totalSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  grandTotalValue: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
  },
});
