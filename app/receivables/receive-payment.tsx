import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import { formatCurrencyINR } from '@/utils/formatters';
import { getReceivables } from '@/services/backendApi';
import { 
  ArrowLeft, 
  Search, 
  User,
  Building2,
  IndianRupee
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

export default function ReceivePaymentScreen() {
  const { customerId, customerData } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReceivables = useCallback(async () => {
    try {
      const result = await getReceivables();
      if (result.success && result.receivables) {
        setCustomers(result.receivables);
      }
    } catch (e) {
      console.warn('Failed to load receivables:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReceivables();
  }, [loadReceivables]);

  const filteredCustomers = searchQuery.trim() === ''
    ? customers
    : customers.filter((customer: any) =>
        (customer.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.mobile || '').includes(searchQuery) ||
        (customer.gstin || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCustomerSelect = (customer: any) => {
    setNavData('collectPaymentCustomer', customer);
    safeRouter.push({ pathname: '/receivables/collect-payment' });
  };

  const formatAmount = (amount: number) => {
    return formatCurrencyINR(amount);
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Implement filter functionality
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
          
          <Text style={styles.headerTitle}>Receive Payment</Text>
        </View>
      </SafeAreaView>

      {/* Search Bar - Top of screen */}
      <View style={styles.topSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Select Customer</Text>
          <Text style={styles.instructionsText}>
            Choose the customer from whom you want to receive payment
          </Text>
        </View>

        {/* Customers List */}
        <View style={styles.customersContainer}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Loading customers...</Text>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <IndianRupee size={64} color={Colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Customers Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No customers match your search criteria' : 'No customers with outstanding receivables'}
              </Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerCard}
                onPress={() => handleCustomerSelect(customer)}
                activeOpacity={0.7}
              >
                <View style={styles.customerHeader}>
                  <View style={styles.customerLeft}>
                    {customer.customerType === 'business' ? (
                      <Building2 size={20} color={Colors.primary} />
                    ) : (
                      <User size={20} color={Colors.primary} />
                    )}
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {customer.customerType === 'business' 
                          ? customer.businessName 
                          : customer.customerName}
                      </Text>
                      {customer.customerType === 'business' && (
                        <Text style={styles.contactPerson}>
                          Contact: {customer.customerName}
                        </Text>
                      )}
                      <Text style={styles.customerMobile}>{customer.mobile}</Text>
                      {customer.gstin && (
                        <Text style={styles.customerGstin}>{customer.gstin}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.customerRight}>
                    <Text style={styles.customerAmount}>
                      {formatAmount(customer.totalReceivable)}
                    </Text>
                    <Text style={styles.customerInvoices}>
                      {customer.invoiceCount} invoices
                    </Text>
                    {customer.overdueAmount > 0 && (
                      <Text style={styles.customerOverdue}>
                        {formatAmount(customer.overdueAmount)} overdue
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: 16,
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
    padding: 16,
    paddingBottom: 100,
  },
  instructionsContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  customersContainer: {
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  customerCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
    gap: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerMobile: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerGstin: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  customerRight: {
    alignItems: 'flex-end',
  },
  customerAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 4,
  },
  customerInvoices: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  customerOverdue: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  // Top search bar styles
  topSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
});