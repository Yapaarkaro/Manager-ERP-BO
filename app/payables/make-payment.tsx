import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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

// Mock suppliers with payables
const mockSuppliersWithPayables = [];

export default function MakePaymentScreen() {
  const { supplierId, supplierData } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState(mockSuppliersWithPayables);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredSuppliers(mockSuppliersWithPayables);
    } else {
      const filtered = mockSuppliersWithPayables.filter(supplier =>
        supplier.supplierName.toLowerCase().includes(query.toLowerCase()) ||
        supplier.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        supplier.mobile.includes(query) ||
        supplier.gstin?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  };

  const handleSupplierSelect = (supplier: any) => {
    // Clear the navigation stack and go to process payment
    router.push({
      pathname: '/payables/process-payment',
      params: {
        supplierData: JSON.stringify(supplier)
      }
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
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
          
          <Text style={styles.headerTitle}>Make Payment</Text>
        </View>
      </SafeAreaView>

      {/* Search Bar - Top of screen */}
      <View style={styles.topSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suppliers..."
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
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Select Supplier</Text>
          <Text style={styles.instructionsText}>
            Choose the supplier to whom you want to make payment
          </Text>
        </View>

        {/* Suppliers List */}
        <View style={styles.suppliersContainer}>
          {filteredSuppliers.length === 0 ? (
            <View style={styles.emptyState}>
              <IndianRupee size={64} color={Colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Suppliers Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No suppliers match your search criteria' : 'No suppliers with outstanding payables'}
              </Text>
            </View>
          ) : (
            filteredSuppliers.map((supplier) => (
              <TouchableOpacity
                key={supplier.id}
                style={styles.supplierCard}
                onPress={() => handleSupplierSelect(supplier)}
                activeOpacity={0.7}
              >
                <View style={styles.supplierHeader}>
                  <View style={styles.supplierLeft}>
                    {supplier.supplierType === 'business' ? (
                      <Building2 size={20} color={Colors.primary} />
                    ) : (
                      <User size={20} color={Colors.primary} />
                    )}
                    <View style={styles.supplierInfo}>
                      <Text style={styles.supplierName}>
                        {supplier.supplierType === 'business' 
                          ? supplier.businessName 
                          : supplier.supplierName}
                      </Text>
                      {supplier.supplierType === 'business' && (
                        <Text style={styles.contactPerson}>
                          Contact: {supplier.supplierName}
                        </Text>
                      )}
                      <Text style={styles.supplierMobile}>{supplier.mobile}</Text>
                      {supplier.gstin && (
                        <Text style={styles.supplierGstin}>{supplier.gstin}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.supplierRight}>
                    <Text style={styles.supplierAmount}>
                      {formatAmount(supplier.totalPayable)}
                    </Text>
                    <Text style={styles.supplierBills}>
                      {supplier.billCount} bills
                    </Text>
                    {supplier.overdueAmount > 0 && (
                      <Text style={styles.supplierOverdue}>
                        {formatAmount(supplier.overdueAmount)} overdue
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
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 20,
  },
  suppliersContainer: {
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
  supplierCard: {
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
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supplierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
    gap: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
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
  supplierMobile: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  supplierGstin: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  supplierRight: {
    alignItems: 'flex-end',
  },
  supplierAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 4,
  },
  supplierBills: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  supplierOverdue: {
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