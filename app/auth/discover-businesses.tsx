import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Building2, UserPlus, CheckCircle, ArrowRight, ShoppingCart, User } from 'lucide-react-native';
import { discoverLinkedBusinesses, searchAllBusinesses, addBusinessAsContact } from '@/services/backendApi';

const Colors = {
  primary: '#3f66ac',
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

interface DiscoveredBusiness {
  id: string;
  legal_name: string;
  owner_name: string;
  phone: string;
  business_type: string;
  linkedAs?: string;
  primary_address?: string;
  primary_city?: string;
  primary_state?: string;
  primary_pincode?: string;
}

export default function DiscoverBusinessesScreen() {
  const [linkedBusinesses, setLinkedBusinesses] = useState<DiscoveredBusiness[]>([]);
  const [searchResults, setSearchResults] = useState<DiscoveredBusiness[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedBusinesses, setAddedBusinesses] = useState<Map<string, 'supplier' | 'customer'>>(new Map());

  useEffect(() => {
    loadLinkedBusinesses();
  }, []);

  const loadLinkedBusinesses = async () => {
    setLoading(true);
    const result = await discoverLinkedBusinesses();
    if (result.success && result.businesses) {
      setLinkedBusinesses(result.businesses);
    }
    setLoading(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const result = await searchAllBusinesses(query.trim());
    if (result.success && result.businesses) {
      setSearchResults(result.businesses);
    }
    setSearching(false);
  }, []);

  const showAddDialog = (business: DiscoveredBusiness) => {
    if (addedBusinesses.has(business.id)) {
      Alert.alert('Already Added', `${business.legal_name} has already been added as your ${addedBusinesses.get(business.id)}.`);
      return;
    }

    Alert.alert(
      'Add Business',
      `How would you like to add "${business.legal_name}" to your business?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'As Supplier',
          onPress: () => confirmAdd(business, 'supplier'),
        },
        {
          text: 'As Customer',
          onPress: () => confirmAdd(business, 'customer'),
        },
      ],
    );
  };

  const confirmAdd = (business: DiscoveredBusiness, addAs: 'supplier' | 'customer') => {
    Alert.alert(
      'Confirm',
      `Are you sure you want to add "${business.legal_name}" as your ${addAs}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Add',
          onPress: () => executeAdd(business, addAs),
        },
      ],
    );
  };

  const executeAdd = async (business: DiscoveredBusiness, addAs: 'supplier' | 'customer') => {
    setAddingId(business.id);
    const result = await addBusinessAsContact({
      targetBusinessId: business.id,
      targetBusinessName: business.legal_name,
      targetOwnerName: business.owner_name || '',
      targetPhone: business.phone || '',
      addAs,
      address: business.primary_address,
      city: business.primary_city,
      state: business.primary_state,
      pincode: business.primary_pincode,
    });

    if (result.success) {
      setAddedBusinesses(prev => new Map(prev).set(business.id, addAs));
      Alert.alert('Added', `${business.legal_name} has been added as your ${addAs}.`);
    } else {
      Alert.alert('Error', result.error || 'Failed to add business. Please try again.');
    }
    setAddingId(null);
  };

  const handleFinish = () => {
    router.replace('/dashboard');
  };

  const renderBusinessCard = ({ item }: { item: DiscoveredBusiness }) => {
    const isAdded = addedBusinesses.has(item.id);
    const addedAs = addedBusinesses.get(item.id);
    const isAdding = addingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.businessCard, isAdded && styles.businessCardAdded]}
        activeOpacity={0.7}
        onPress={() => showAddDialog(item)}
        disabled={isAdding}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.legal_name) }]}>
          <Text style={styles.avatarText}>{getInitials(item.legal_name)}</Text>
        </View>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName} numberOfLines={1}>{item.legal_name}</Text>
          {item.owner_name ? (
            <Text style={styles.ownerName} numberOfLines={1}>{item.owner_name}</Text>
          ) : null}
          {item.primary_city ? (
            <Text style={styles.businessType}>
              {[item.primary_city, item.primary_state].filter(Boolean).join(', ')}
            </Text>
          ) : item.business_type ? (
            <Text style={styles.businessType}>{item.business_type}</Text>
          ) : null}
          {item.linkedAs && !isAdded && (
            <View style={[styles.linkedBadge, item.linkedAs === 'supplier' ? styles.supplierBadge : styles.customerBadge]}>
              <Text style={[styles.linkedBadgeText, item.linkedAs === 'supplier' ? styles.supplierBadgeText : styles.customerBadgeText]}>
                Added you as {item.linkedAs}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actionArea}>
          {isAdding ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : isAdded ? (
            <View style={styles.addedBadge}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.addedText}>{addedAs === 'supplier' ? 'Supplier' : 'Customer'}</Text>
            </View>
          ) : (
            <View style={styles.addButton}>
              <UserPlus size={18} color={Colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const displayList = searchQuery.trim().length >= 2 ? searchResults : linkedBusinesses;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Businesses</Text>
        <Text style={styles.headerSubtitle}>
          Find businesses on Manager and add them as your suppliers or customers
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses on Manager..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      </View>

      {!searchQuery.trim() && linkedBusinesses.length > 0 && (
        <View style={styles.sectionHeader}>
          <Building2 size={16} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Businesses that know you</Text>
        </View>
      )}

      {searchQuery.trim().length >= 2 && (
        <View style={styles.sectionHeader}>
          <Search size={16} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Search results</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding businesses...</Text>
        </View>
      ) : searching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : displayList.length === 0 ? (
        <View style={styles.centered}>
          <Building2 size={48} color={Colors.grey[300]} />
          <Text style={styles.emptyTitle}>
            {searchQuery.trim().length >= 2 ? 'No businesses found' : 'No linked businesses yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.trim().length >= 2
              ? 'Try a different search term'
              : 'Search for businesses on Manager to add them'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        {addedBusinesses.size > 0 && (
          <Text style={styles.addedCount}>
            {addedBusinesses.size} business{addedBusinesses.size !== 1 ? 'es' : ''} added
          </Text>
        )}
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.finishButtonText}>
            {addedBusinesses.size > 0 ? 'Finish & Go to Dashboard' : 'Skip & Go to Dashboard'}
          </Text>
          <ArrowRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const palette = ['#3f66ac', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#4338CA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.grey[50],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 12,
  },
  businessCardAdded: {
    borderColor: Colors.success,
    backgroundColor: '#F0FDF4',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  businessInfo: {
    flex: 1,
    gap: 2,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  ownerName: {
    fontSize: 13,
    color: Colors.textLight,
  },
  businessType: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  linkedBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  supplierBadge: {
    backgroundColor: '#FFF7ED',
  },
  customerBadge: {
    backgroundColor: '#ECFDF5',
  },
  linkedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  supplierBadgeText: {
    color: '#EA580C',
  },
  customerBadgeText: {
    color: '#059669',
  },
  actionArea: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF0FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 8,
    alignItems: 'center',
  },
  addedCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
