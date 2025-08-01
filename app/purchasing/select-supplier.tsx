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
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Building2,
  User,
  Star,
  Package,
  Award
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

// Mock suppliers data
const mockSuppliers = [
  {
    id: 'SUP-001',
    name: 'Apple India Pvt Ltd',
    businessName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    contactPerson: 'Rajesh Kumar',
    mobile: '+91 98765 43210',
    email: 'orders@apple.com',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    supplierScore: 92,
    onTimeDelivery: 95,
    qualityRating: 4.8,
    productCount: 25,
    categories: ['Smartphones', 'Laptops', 'Audio', 'Accessories'],
    paymentTerms: 'Net 30 Days',
    deliveryTime: '3-5 Business Days',
  },
  {
    id: 'SUP-002',
    name: 'Samsung Electronics',
    businessName: 'Samsung Electronics India Pvt Ltd',
    supplierType: 'business',
    contactPerson: 'Priya Sharma',
    mobile: '+91 87654 32109',
    email: 'business@samsung.com',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    supplierScore: 88,
    onTimeDelivery: 90,
    qualityRating: 4.6,
    productCount: 32,
    categories: ['Smartphones', 'Tablets', 'Audio', 'Home Appliances'],
    paymentTerms: 'Net 15 Days',
    deliveryTime: '2-4 Business Days',
  },
  {
    id: 'SUP-003',
    name: 'Dell Technologies',
    businessName: 'Dell Technologies India Pvt Ltd',
    supplierType: 'business',
    contactPerson: 'Amit Singh',
    mobile: '+91 76543 21098',
    email: 'sales@dell.com',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    supplierScore: 85,
    onTimeDelivery: 88,
    qualityRating: 4.5,
    productCount: 18,
    categories: ['Laptops', 'Desktops', 'Servers', 'Accessories'],
    paymentTerms: 'Net 45 Days',
    deliveryTime: '5-7 Business Days',
  },
];

export default function SelectSupplierScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState(mockSuppliers);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredSuppliers(mockSuppliers);
    } else {
      const filtered = mockSuppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(query.toLowerCase()) ||
        supplier.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(query.toLowerCase()) ||
        supplier.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    }
  };

  const handleSupplierSelect = (supplier: any) => {
    router.push({
      pathname: '/purchasing/create-po',
      params: {
        supplierId: supplier.id,
        supplierData: JSON.stringify(supplier)
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 80) return Colors.warning;
    if (score >= 70) return '#f59e0b';
    return Colors.error;
  };

  const renderSupplierCard = (supplier: any) => {
    const scoreColor = getScoreColor(supplier.supplierScore);

    return (
      <TouchableOpacity
        key={supplier.id}
        style={[
          styles.supplierCard,
          { borderLeftColor: scoreColor }
        ]}
        onPress={() => handleSupplierSelect(supplier)}
        activeOpacity={0.7}
      >
        <View style={styles.supplierHeader}>
          <View style={styles.supplierLeft}>
            <Image 
              source={{ uri: supplier.avatar }}
              style={styles.supplierAvatar}
            />
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>
                {supplier.supplierType === 'business' ? supplier.businessName : supplier.name}
              </Text>
              <Text style={styles.contactPerson}>
                Contact: {supplier.contactPerson}
              </Text>
              <View style={styles.supplierMeta}>
                {supplier.supplierType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.supplierType}>
                  {supplier.supplierType === 'business' ? 'Business' : 'Individual'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.supplierRight}>
            <View style={[
              styles.scoreBadge,
              { backgroundColor: `${scoreColor}20` }
            ]}>
              <Award size={14} color={scoreColor} />
              <Text style={[
                styles.scoreText,
                { color: scoreColor }
              ]}>
                {supplier.supplierScore}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.supplierDetails}>
          <View style={styles.detailRow}>
            <Package size={14} color={Colors.textLight} />
            <Text style={styles.detailText}>
              {supplier.productCount} products
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Star size={14} color={Colors.warning} />
            <Text style={styles.detailText}>
              {supplier.qualityRating}/5 rating
            </Text>
          </View>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesLabel}>Categories:</Text>
          <View style={styles.categoriesContainer}>
            {supplier.categories.slice(0, 3).map((category: string, index: number) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
            {supplier.categories.length > 3 && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  +{supplier.categories.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            {supplier.paymentTerms} • {supplier.deliveryTime}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
          
          <Text style={styles.headerTitle}>Select Supplier</Text>
        </View>
      </SafeAreaView>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Choose Supplier</Text>
        <Text style={styles.instructionsText}>
          Select a supplier to create a purchase order
        </Text>
      </View>

      {/* Suppliers List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Suppliers Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No suppliers match your search criteria' : 'No suppliers available'}
            </Text>
          </View>
        ) : (
          filteredSuppliers.map(renderSupplierCard)
        )}
      </ScrollView>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search suppliers..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Filter suppliers')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  },
  instructionsContainer: {
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  supplierHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  supplierLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  supplierAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
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
  supplierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supplierType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  supplierRight: {
    alignItems: 'flex-end',
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
  supplierDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textLight,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 10,
    color: Colors.background,
    fontWeight: '500',
  },
  termsSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  termsText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
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
});