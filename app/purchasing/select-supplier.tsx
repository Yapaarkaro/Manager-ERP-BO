import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Building2,
  User,
  Phone,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { getSuppliers } from '@/services/backendApi';

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
  },
};

export default function SelectSupplierScreen() {
  const { autoPoItems: rawAutoPoItems } = useLocalSearchParams();
  const autoPoItems = rawAutoPoItems ? JSON.parse(rawAutoPoItems as string) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await getSuppliers();
      if (result.success && result.suppliers) {
        setSuppliers(result.suppliers);
      }
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const filtered = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.business_name || '').toLowerCase().includes(q) ||
      (s.contact_person || '').toLowerCase().includes(q) ||
      (s.mobile || '').includes(q) ||
      (s.gstin || '').toLowerCase().includes(q)
    );
  });

  const handleSupplierSelect = (supplier: any) => {
    const mapped = {
      id: supplier.id,
      name: supplier.contact_person || supplier.business_name || 'Supplier',
      businessName: supplier.business_name || '',
      contactPerson: supplier.contact_person || '',
      supplierType: supplier.supplier_type || 'business',
      mobile: supplier.mobile || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      address: supplier.address || '',
      business_id: supplier.business_id || null,
    };

    if (autoPoItems) {
      const supplierGroup = [{
        supplierId: mapped.id,
        supplierName: mapped.businessName || mapped.name,
        supplierBusinessId: mapped.business_id,
        products: autoPoItems,
      }];
      safeRouter.push({
        pathname: '/inventory/auto-po-review' as any,
        params: { supplierGroups: JSON.stringify(supplierGroup) },
      });
      return;
    }

    safeRouter.push({
      pathname: '/purchasing/create-po',
      params: {
        supplierId: mapped.id,
        supplierData: JSON.stringify(mapped),
      },
    });
  };

  const getInitials = (supplier: any) => {
    const name = supplier.business_name || supplier.contact_person || '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderSupplierCard = ({ item: supplier }: { item: any }) => {
    const displayName = supplier.business_name || supplier.contact_person || 'Unnamed Supplier';
    const isBusiness = supplier.supplier_type === 'business';

    return (
      <TouchableOpacity
        style={styles.supplierCard}
        onPress={() => handleSupplierSelect(supplier)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(supplier)}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.supplierName} numberOfLines={1}>{displayName}</Text>

          {supplier.contact_person && supplier.business_name ? (
            <View style={styles.metaRow}>
              <User size={13} color={Colors.textLight} />
              <Text style={styles.metaText}>{supplier.contact_person}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {isBusiness ? (
              <Building2 size={13} color={Colors.textLight} />
            ) : (
              <User size={13} color={Colors.textLight} />
            )}
            <Text style={styles.metaText}>{isBusiness ? 'Business' : 'Individual'}</Text>
            {supplier.mobile ? (
              <>
                <Phone size={13} color={Colors.textLight} style={{ marginLeft: 10 }} />
                <Text style={styles.metaText}>{supplier.mobile}</Text>
              </>
            ) : null}
          </View>

          {supplier.address ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={Colors.textLight} />
              <Text style={styles.metaText} numberOfLines={1}>{supplier.address}</Text>
            </View>
          ) : null}
        </View>

        <ChevronRight size={20} color={Colors.grey[300]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Supplier</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suppliers..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading suppliers...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderSupplierCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Building2 size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No suppliers match your search' : 'No suppliers added yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Add suppliers from the Suppliers section'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
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
    padding: 0,
  },
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardContent: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
