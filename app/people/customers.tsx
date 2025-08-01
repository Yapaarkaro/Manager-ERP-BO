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
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Plus, Building2, User, Phone, Mail, MapPin, Star, ShoppingCart, TrendingUp, TrendingDown, Eye, MessageCircle, Award, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';

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

interface Customer {
  id: string;
  name: string;
  businessName?: string;
  customerType: 'business' | 'individual';
  contactPerson: string;
  mobile: string;
  email?: string;
  address: string;
  gstin?: string;
  avatar: string;
  customerScore: number;
  onTimePayment: number;
  satisfactionRating: number;
  responseTime: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalValue: number;
  averageOrderValue: number;
  returnRate: number;
  lastOrderDate: string;
  joinedDate: string;
  status: 'active' | 'inactive' | 'suspended';
  paymentTerms?: string;
  creditLimit?: number;
  categories: string[];
}

const mockCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'TechCorp Solutions Pvt Ltd',
    businessName: 'TechCorp Solutions Pvt Ltd',
    customerType: 'business',
    contactPerson: 'Rajesh Kumar',
    mobile: '+91 98765 43210',
    email: 'orders@techcorp.com',
    address: '123, Electronic City, Phase 1, Bangalore, Karnataka - 560100',
    gstin: '29ABCDE1234F2Z6',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    customerScore: 94,
    onTimePayment: 96,
    satisfactionRating: 4.9,
    responseTime: 1.5,
    totalOrders: 52,
    completedOrders: 50,
    pendingOrders: 1,
    cancelledOrders: 1,
    returnedOrders: 2,
    totalValue: 3200000,
    averageOrderValue: 61538,
    returnRate: 3.8,
    lastOrderDate: '2024-01-15',
    joinedDate: '2023-02-15',
    status: 'active',
    paymentTerms: 'Net 30 Days',
    creditLimit: 500000,
    categories: ['Smartphones', 'Laptops', 'Audio', 'Accessories']
  },
  {
    id: 'CUST-002',
    name: 'Global Enterprises Ltd',
    businessName: 'Global Enterprises Ltd',
    customerType: 'business',
    contactPerson: 'Priya Sharma',
    mobile: '+91 87654 32109',
    email: 'procurement@globalent.com',
    address: '456, Bandra West, Mumbai, Maharashtra - 400050',
    gstin: '27FGHIJ5678K3L9',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    customerScore: 89,
    onTimePayment: 92,
    satisfactionRating: 4.7,
    responseTime: 2.1,
    totalOrders: 38,
    completedOrders: 36,
    pendingOrders: 1,
    cancelledOrders: 1,
    returnedOrders: 3,
    totalValue: 2100000,
    averageOrderValue: 55263,
    returnRate: 7.9,
    lastOrderDate: '2024-01-12',
    joinedDate: '2023-04-20',
    status: 'active',
    paymentTerms: 'Net 15 Days',
    creditLimit: 300000,
    categories: ['Smartphones', 'Tablets', 'Audio', 'Home Appliances']
  },
  {
    id: 'CUST-003',
    name: 'Rajesh Kumar',
    customerType: 'individual',
    contactPerson: 'Rajesh Kumar',
    mobile: '+91 76543 21098',
    email: 'rajesh@email.com',
    address: '789, MG Road, Pune, Maharashtra - 411001',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    customerScore: 87,
    onTimePayment: 89,
    satisfactionRating: 4.5,
    responseTime: 3.2,
    totalOrders: 15,
    completedOrders: 14,
    pendingOrders: 1,
    cancelledOrders: 0,
    returnedOrders: 1,
    totalValue: 450000,
    averageOrderValue: 30000,
    returnRate: 6.7,
    lastOrderDate: '2024-01-10',
    joinedDate: '2023-08-12',
    status: 'active',
    categories: ['Smartphones', 'Audio', 'Accessories']
  },
  {
    id: 'CUST-004',
    name: 'Metro Retail Chain',
    businessName: 'Metro Retail Chain Pvt Ltd',
    customerType: 'business',
    contactPerson: 'Amit Singh',
    mobile: '+91 99887 76655',
    email: 'orders@metroretail.com',
    address: '321, Jayanagar, 4th Block, Bangalore, Karnataka - 560011',
    gstin: '29PQRST5678U9V0',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    customerScore: 91,
    onTimePayment: 94,
    satisfactionRating: 4.8,
    responseTime: 1.8,
    totalOrders: 42,
    completedOrders: 40,
    pendingOrders: 2,
    cancelledOrders: 0,
    returnedOrders: 1,
    totalValue: 1800000,
    averageOrderValue: 42857,
    returnRate: 2.4,
    lastOrderDate: '2024-01-14',
    joinedDate: '2023-06-08',
    status: 'active',
    paymentTerms: 'Net 45 Days',
    creditLimit: 750000,
    categories: ['Smartphones', 'Laptops', 'Audio', 'Gaming']
  },
  {
    id: 'CUST-005',
    name: 'Sunita Devi',
    customerType: 'individual',
    contactPerson: 'Sunita Devi',
    mobile: '+91 88776 65544',
    email: 'sunita@email.com',
    address: '567, Whitefield, Bangalore, Karnataka - 560066',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    customerScore: 82,
    onTimePayment: 85,
    satisfactionRating: 4.3,
    responseTime: 4.5,
    totalOrders: 8,
    completedOrders: 7,
    pendingOrders: 1,
    cancelledOrders: 0,
    returnedOrders: 2,
    totalValue: 180000,
    averageOrderValue: 22500,
    returnRate: 25.0,
    lastOrderDate: '2024-01-08',
    joinedDate: '2023-11-12',
    status: 'active',
    categories: ['Smartphones', 'Accessories']
  },
];

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState(mockCustomers);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'business' | 'high_score'>('all');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = mockCustomers;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        customer.contactPerson.toLowerCase().includes(query.toLowerCase()) ||
        customer.mobile.includes(query) ||
        customer.email?.toLowerCase().includes(query.toLowerCase()) ||
        customer.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(customer => {
        switch (filter) {
          case 'business':
            return customer.customerType === 'business';
          case 'high_score':
            return customer.customerScore >= 85;
          default:
            return true;
        }
      });
    }

    setFilteredCustomers(filtered);
  };

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: '/people/customer-details',
      params: {
        customerId: customer.id,
        customerData: JSON.stringify(customer)
      }
    });
  };

  const handleAddCustomer = () => {
    router.push('/people/add-customer');
  };

  const handleChatPress = (customer: Customer) => {
    if (customer.customerType === 'business') {
      router.push({
        pathname: '/people/customer-chat',
        params: {
          customerId: customer.id,
          customerName: customer.businessName || customer.name,
          customerAvatar: customer.avatar
        }
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 80) return Colors.warning;
    if (score >= 70) return '#f59e0b';
    return Colors.error;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'inactive': return Colors.error;
      case 'suspended': return Colors.warning;
      default: return Colors.textLight;
    }
  };

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
      month: 'short',
      year: 'numeric'
    });
  };

  const renderCustomerCard = (customer: Customer) => {
    const scoreColor = getScoreColor(customer.customerScore);
    const statusColor = getStatusColor(customer.status);

    return (
      <TouchableOpacity
        key={customer.id}
        style={[
          styles.customerCard,
          { borderLeftColor: scoreColor }
        ]}
        onPress={() => handleCustomerPress(customer)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.customerHeader}>
          <View style={styles.customerLeft}>
            <Image 
              source={{ uri: customer.avatar }}
              style={styles.customerAvatar}
            />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {customer.customerType === 'business' ? customer.businessName : customer.name}
              </Text>
              <Text style={styles.contactPerson}>
                Contact: {customer.contactPerson}
              </Text>
              <View style={styles.customerMeta}>
                {customer.customerType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.customerType}>
                  {customer.customerType === 'business' ? 'Business' : 'Individual'}
                </Text>
                {customer.gstin && (
                  <Text style={styles.gstin}>• {customer.gstin}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.customerRight}>
            <View style={[
              styles.scoreBadge,
              { backgroundColor: `${scoreColor}20` }
            ]}>
              <Award size={14} color={scoreColor} />
              <Text style={[
                styles.scoreText,
                { color: scoreColor }
              ]}>
                {customer.customerScore}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: statusColor }
              ]}>
                {customer.status.toUpperCase()}
              </Text>
            </View>

            {customer.customerType === 'business' && (
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => handleChatPress(customer)}
                activeOpacity={0.7}
              >
                <MessageCircle size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceSection}>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.performanceLabel}>On-Time Pay</Text>
              <Text style={[
                styles.performanceValue,
                { color: customer.onTimePayment >= 90 ? Colors.success : Colors.warning }
              ]}>
                {customer.onTimePayment}%
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Star size={16} color={Colors.warning} />
              <Text style={styles.performanceLabel}>Rating</Text>
              <Text style={styles.performanceValue}>
                {customer.satisfactionRating}/5
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <ShoppingCart size={16} color={Colors.success} />
              <Text style={styles.performanceLabel}>Orders</Text>
              <Text style={styles.performanceValue}>
                {customer.totalOrders}
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <TrendingUp size={16} color={Colors.primary} />
              <Text style={styles.performanceLabel}>Avg Value</Text>
              <Text style={styles.performanceValue}>
                {formatAmount(customer.averageOrderValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.orderSummaryRow}>
            <Text style={styles.orderSummaryLabel}>Total Value:</Text>
            <Text style={styles.orderSummaryValue}>
              {formatAmount(customer.totalValue)}
            </Text>
          </View>
          <View style={styles.orderSummaryRow}>
            <Text style={styles.orderSummaryLabel}>Return Rate:</Text>
            <Text style={[
              styles.orderSummaryValue,
              { color: customer.returnRate > 10 ? Colors.error : customer.returnRate > 5 ? Colors.warning : Colors.success }
            ]}>
              {customer.returnRate}%
            </Text>
          </View>
          <View style={styles.orderSummaryRow}>
            <Text style={styles.orderSummaryLabel}>Last Order:</Text>
            <Text style={styles.orderSummaryValue}>
              {formatDate(customer.lastOrderDate)}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesLabel}>Purchase Categories:</Text>
          <View style={styles.categoriesContainer}>
            {customer.categories.slice(0, 3).map((category, index) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
            {customer.categories.length > 3 && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  +{customer.categories.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <Phone size={14} color={Colors.textLight} />
            <Text style={styles.contactText}>{customer.mobile}</Text>
          </View>
          {customer.email && (
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.textLight} />
              <Text style={styles.contactText}>{customer.email}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const activeCustomers = filteredCustomers.filter(c => c.status === 'active').length;
  const businessCustomers = filteredCustomers.filter(c => c.customerType === 'business').length;
  const avgScore = Math.round(filteredCustomers.reduce((sum, c) => sum + c.customerScore, 0) / filteredCustomers.length);
  const totalValue = filteredCustomers.reduce((sum, c) => sum + c.totalValue, 0);

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
        
        <Text style={styles.headerTitle}>Customers</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredCustomers.length} customers
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <CheckCircle size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {activeCustomers}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Building2 size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Business</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {businessCustomers}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Award size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Avg Score</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {avgScore}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <TrendingUp size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalValue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'All Customers', count: mockCustomers.length },
            { key: 'business', label: 'Business Only', count: mockCustomers.filter(c => c.customerType === 'business').length },
            { key: 'high_score', label: 'High Score', count: mockCustomers.filter(c => c.customerScore >= 85).length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => handleFilterChange(filter.key as typeof selectedFilter)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterTabCount,
                selectedFilter === filter.key && styles.activeFilterTabCount
              ]}>
                <Text style={[
                  styles.filterTabCountText,
                  selectedFilter === filter.key && styles.activeFilterTabCountText
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Customers List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Customers Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No customers match your search criteria' : 'No customers available'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map(renderCustomerCard)
        )}
      </ScrollView>

      {/* Add Customer FAB */}
      <TouchableOpacity
        style={styles.addCustomerFAB}
        onPress={handleAddCustomer}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addCustomerText}>Add Customer</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Advanced filter')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  headerRight: {
    alignItems: 'flex-end',
  },
  totalCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  activeFilterTab: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterTabText: {
    color: Colors.background,
  },
  filterTabCount: {
    backgroundColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterTabCount: {
    backgroundColor: Colors.background,
  },
  filterTabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterTabCountText: {
    color: Colors.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
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
    marginBottom: 16,
  },
  customerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 6,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  gstin: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  customerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  performanceSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    gap: 4,
  },
  performanceLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  orderSummary: {
    gap: 6,
    marginBottom: 12,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSummaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  orderSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  categoriesSection: {
    marginBottom: 12,
  },
  categoriesLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 10,
    color: Colors.background,
    fontWeight: '500',
  },
  contactSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  floatingSearchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    outlineStyle: 'none',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  addCustomerFAB: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addCustomerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});