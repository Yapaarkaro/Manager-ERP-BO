import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building, FileText, CreditCard, Smartphone, Banknote, Receipt, ExternalLink, Calendar, Hash, User, Building2, Check, X } from 'lucide-react-native';
import { BankTransaction } from '@/utils/dataStore';
import { getCashTransactionById, getBankTransactionById, invalidateApiCache } from '@/services/backendApi';
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

export default function TransactionDetailsScreen() {
  const { transactionId, bankAccountId, transactionType, transactionData } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<BankTransaction | null>(null);
  const [relatedInvoice, setRelatedInvoice] = useState<any>(null);
  const [relatedCustomer, setRelatedCustomer] = useState<any>(null);
  const [relatedSupplier, setRelatedSupplier] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isCash = transactionType === 'cash';

  useEffect(() => {
    loadTransactionDetails();
  }, [transactionId]);

  const loadTransactionDetails = async () => {
    if (!transactionId) { setIsLoading(false); return; }
    setIsLoading(true);

    try {
      if (transactionData) {
        try {
          const parsed = JSON.parse(transactionData as string);
          setTransaction({
            id: parsed.id,
            bankAccountId: parsed.bankAccountId || '',
            type: parsed.type,
            amount: parseFloat(parsed.amount) || 0,
            description: parsed.description || '',
            date: parsed.date || parsed.transaction_date || parsed.createdAt || '',
            source: parsed.source || parsed.referenceType || 'Cash',
            reference: parsed.reference || parsed.referenceNumber || parsed.reference_number || '',
            category: parsed.category || parsed.referenceType || '',
            transactionNumber: parsed.transactionNumber || parsed.transaction_number || parsed.id?.substring(0, 8) || '',
            relatedInvoiceId: parsed.relatedInvoiceId || parsed.related_invoice_id || parsed.referenceId || '',
            relatedCustomerId: parsed.relatedCustomerId || parsed.related_customer_id || '',
            relatedSupplierId: parsed.relatedSupplierId || parsed.related_supplier_id || '',
            createdAt: parsed.createdAt || parsed.created_at || '',
          } as any);
          setIsLoading(false);
          return;
        } catch { /* ignore parse error, fall through */ }
      }

      if (isCash) {
        const cashResult = await getCashTransactionById(transactionId as string);
        let txn = cashResult?.transaction;

        if (txn) {
          const refType = txn.reference_type || '';
          const sourceLabel = refType === 'return' ? 'Sales Return' : refType === 'invoice' ? 'Sales Invoice' : refType === 'purchase_invoice' ? 'Purchase Invoice' : refType ? refType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Cash';
          setTransaction({
            id: txn.id,
            bankAccountId: '',
            type: txn.type,
            amount: parseFloat(txn.amount) || 0,
            description: txn.description || '',
            date: txn.transaction_date || txn.date || txn.created_at || '',
            source: sourceLabel,
            reference: txn.reference_number || txn.reference_id || '',
            category: refType || txn.category || 'Cash',
            transactionNumber: txn.id?.substring(0, 8) || '',
            relatedInvoiceId: txn.related_invoice_id || txn.reference_id || '',
            relatedCustomerId: txn.related_customer_id || '',
            relatedSupplierId: txn.related_supplier_id || '',
            createdAt: txn.created_at || '',
          } as any);

          const invoiceId = txn.related_invoice_id || txn.reference_id;
          if (invoiceId) {
            const { getInvoiceWithItems } = await import('@/services/backendApi');
            const invResult = await getInvoiceWithItems(invoiceId);
            if (invResult.success && invResult.invoice) setRelatedInvoice(invResult.invoice);
          }
        }
      } else {
        const bankResult = await getBankTransactionById(transactionId as string);
        let txn = bankResult?.transaction;

        if (txn) {
          setTransaction({
            id: txn.id,
            bankAccountId: txn.bank_account_id || '',
            type: txn.type,
            amount: parseFloat(txn.amount) || 0,
            description: txn.description || '',
            date: txn.transaction_date || txn.created_at || '',
            source: txn.source || txn.payment_mode || 'Bank Transfer',
            reference: txn.reference_number || txn.reference || '',
            category: txn.category || '',
            transactionNumber: txn.transaction_number || txn.id?.substring(0, 8) || '',
            relatedInvoiceId: txn.related_invoice_id || '',
            relatedCustomerId: txn.related_customer_id || '',
            relatedSupplierId: txn.related_supplier_id || '',
            createdAt: txn.created_at || '',
          } as any);

          if (result?.data?.relatedCustomer) setRelatedCustomer(result.data.relatedCustomer);
          if (result?.data?.relatedSupplier) setRelatedSupplier(result.data.relatedSupplier);

          if (txn.related_invoice_id) {
            const { getInvoiceWithItems } = await import('@/services/backendApi');
            const invResult = await getInvoiceWithItems(txn.related_invoice_id);
            if (invResult.success && invResult.invoice) setRelatedInvoice(invResult.invoice);
          }
        }
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadTransactionDetails().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [transactionId]);

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'UPI':
        return <Smartphone size={24} color={Colors.primary} />;
      case 'Card':
        return <CreditCard size={24} color={Colors.primary} />;
      case 'Cheque':
        return <Receipt size={24} color={Colors.primary} />;
      case 'Cash':
        return <Banknote size={24} color={Colors.primary} />;
      case 'Bank Transfer':
      case 'NEFT':
      case 'RTGS':
      case 'IMPS':
        return <Building size={24} color={Colors.primary} />;
      default:
        return <FileText size={24} color={Colors.primary} />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'UPI':
        return Colors.primary;
      case 'Card':
        return Colors.success;
      case 'Cheque':
        return Colors.warning;
      case 'Cash':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const handleInvoicePress = () => {
    if (transaction?.relatedInvoiceId) {
      safeRouter.push({
        pathname: '/invoice-details',
        params: {
          invoiceId: transaction.relatedInvoiceId,
        }
      });
    }
  };

  const handleCustomerPress = () => {
    if (transaction?.relatedCustomerId) {
      safeRouter.push({
        pathname: '/people/customer-details',
        params: {
          customerId: transaction.relatedCustomerId,
        }
      });
    }
  };

  const handleSupplierPress = () => {
    if (transaction?.relatedSupplierId) {
      safeRouter.push({
        pathname: '/purchasing/supplier-details',
        params: {
          supplierId: transaction.relatedSupplierId,
        }
      });
    }
  };



  if (isLoading || !transaction) {
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
            <Text style={styles.headerTitle}>Transaction Details</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.errorText, { marginTop: 12 }]}>Loading transaction...</Text>
            </>
          ) : (
            <Text style={styles.errorText}>Transaction not found</Text>
          )}
        </View>
      </View>
    );
  }

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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Transaction Details</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Transaction Header */}
        <View style={styles.transactionHeader}>
          <View style={styles.transactionHeaderTop}>
            <View style={styles.transactionIcon}>
              {getSourceIcon(transaction.source)}
            </View>
            <View style={styles.transactionHeaderInfo}>
              <Text style={styles.transactionTitle}>{transaction.description}</Text>
              <Text style={styles.transactionSource}>{transaction.source}</Text>
            </View>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text style={[
              styles.amountText,
              { color: transaction.type === 'credit' ? Colors.success : Colors.error }
            ]}>
              {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
            </Text>
            <Text style={[
              styles.transactionType,
              { color: transaction.type === 'credit' ? Colors.success : Colors.error }
            ]}>
              {transaction.type === 'credit' ? 'Credit' : 'Debit'}
            </Text>
          </View>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.detailLabelText}>Transaction ID</Text>
            </View>
            <Text style={[styles.detailValue, styles.transactionIdValue]} numberOfLines={1} ellipsizeMode="tail">
              {transaction.transactionNumber}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.detailLabelText}>Date & Time</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <FileText size={16} color={Colors.textLight} />
              <Text style={styles.detailLabelText}>Reference</Text>
            </View>
            <Text style={styles.detailValue}>{transaction.reference}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Building size={16} color={Colors.textLight} />
              <Text style={styles.detailLabelText}>Payment Method</Text>
            </View>
            <Text style={[
              styles.detailValue,
              { color: getSourceColor(transaction.source) }
            ]}>
              {transaction.source}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <FileText size={16} color={Colors.textLight} />
              <Text style={styles.detailLabelText}>Category</Text>
            </View>
            <Text style={styles.detailValue}>{transaction.category}</Text>
          </View>
        </View>

        {/* Related Information */}
        {transaction.relatedInvoiceId && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Related Invoice</Text>
            <TouchableOpacity
              style={styles.relatedCard}
              onPress={handleInvoicePress}
              activeOpacity={0.7}
            >
              <View style={styles.relatedCardContent}>
                <View style={styles.relatedCardLeft}>
                  <FileText size={20} color={Colors.primary} />
                  <View style={styles.relatedCardTextContainer}>
                    <Text style={styles.relatedCardTitle} numberOfLines={1} ellipsizeMode="tail">
                      Invoice #{transaction.relatedInvoiceId}
                    </Text>
                    <Text style={styles.relatedCardSubtitle} numberOfLines={1} ellipsizeMode="tail">
                      Click to view invoice details
                    </Text>
                  </View>
                </View>
                <ExternalLink size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {relatedCustomer && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Related Customer</Text>
            <TouchableOpacity
              style={styles.relatedCard}
              onPress={handleCustomerPress}
              activeOpacity={0.7}
            >
              <View style={styles.relatedCardContent}>
                <View style={styles.relatedCardLeft}>
                  <User size={20} color={Colors.primary} />
                  <View style={styles.relatedCardTextContainer}>
                    <Text style={styles.relatedCardTitle} numberOfLines={1} ellipsizeMode="tail">
                      {relatedCustomer.businessName || relatedCustomer.name}
                    </Text>
                    <Text style={styles.relatedCardSubtitle} numberOfLines={1} ellipsizeMode="tail">
                      {relatedCustomer.contactPerson} • {relatedCustomer.mobile}
                    </Text>
                  </View>
                </View>
                <ExternalLink size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {relatedSupplier && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Related Supplier</Text>
            <TouchableOpacity
              style={styles.relatedCard}
              onPress={handleSupplierPress}
              activeOpacity={0.7}
            >
              <View style={styles.relatedCardContent}>
                <View style={styles.relatedCardLeft}>
                  <Building2 size={20} color={Colors.primary} />
                  <View style={styles.relatedCardTextContainer}>
                    <Text style={styles.relatedCardTitle} numberOfLines={1} ellipsizeMode="tail">
                      {relatedSupplier.businessName || relatedSupplier.name}
                    </Text>
                    <Text style={styles.relatedCardSubtitle} numberOfLines={1} ellipsizeMode="tail">
                      {relatedSupplier.contactPerson} • {relatedSupplier.mobile}
                    </Text>
                  </View>
                </View>
                <ExternalLink size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Cheque Information Section */}
        {transaction?.source === 'Cheque' && (
          <View style={styles.chequeInfoSection}>
            <Text style={styles.sectionTitle}>Cheque Information</Text>
            
            {transaction?.isCleared ? (
              <View style={styles.clearedChequeInfo}>
                <View style={styles.clearedChequeRow}>
                  <Check size={20} color={Colors.success} />
                  <Text style={styles.clearedChequeText}>Cheque Cleared</Text>
                </View>
                {transaction?.clearanceDate && (
                  <Text style={styles.clearanceDateText}>
                    Cleared on: {formatDate(transaction?.clearanceDate || '')}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.unclearedChequeInfo}>
                <View style={styles.unclearedChequeRow}>
                  <X size={20} color={Colors.warning} />
                  <Text style={styles.unclearedChequeText}>Uncleared Cheque</Text>
                </View>
                {transaction?.chequeNumber && (
                  <Text style={styles.chequeDetailsText}>
                    Cheque #: {transaction?.chequeNumber}
                  </Text>
                )}
                {transaction?.chequeDate && (
                  <Text style={styles.chequeDetailsText}>
                    Cheque Date: {formatDate(transaction?.chequeDate || '')}
                  </Text>
                )}
                <Text style={styles.unclearedBalanceNote}>
                  Note: This amount is not yet reflected in your balance. 
                  Please manage this cheque from the main banking page.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Header
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
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Transaction Header
  transactionHeader: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  transactionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  transactionHeaderInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  transactionSource: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  transactionAmountContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Details Section
  detailsSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    marginRight: 12,
  },
  detailLabelText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 8,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 0.6,
    textAlign: 'right',
    flexShrink: 1,
  },
  transactionIdValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.primary,
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },

  // Related Section
  relatedSection: {
    marginBottom: 20,
  },
  relatedCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  relatedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  relatedCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  relatedCardTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  relatedCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  relatedCardSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },

  // Cheque Information Styles
  chequeInfoSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  clearedChequeInfo: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  clearedChequeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearedChequeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: 8,
  },
  clearanceDateText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  unclearedChequeInfo: {
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  unclearedChequeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  unclearedChequeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: 8,
  },
  chequeDetailsText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  unclearedBalanceNote: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
    marginBottom: 8,
  },


});
