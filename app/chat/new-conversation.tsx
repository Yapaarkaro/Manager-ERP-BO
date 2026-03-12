import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Users, User, ShoppingCart, Briefcase, CheckCircle, XCircle } from 'lucide-react-native';
import { usePermissions } from '@/contexts/PermissionContext';
import { useBusinessData } from '@/hooks/useBusinessData';
import {
  getStaff,
  getCustomers,
  getSuppliers,
  getOrCreateConversation,
  autoLinkSupplierToUser,
} from '@/services/backendApi';
import { supabase } from '@/lib/supabase';

const Colors = {
  primary: '#3f66ac',
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

interface Contact {
  id: string;
  name: string;
  subtitle: string;
  onManager?: boolean;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const palette = ['#3f66ac', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#4338CA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function NewConversationScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { isStaff, staffBusinessId, staffId, staffName } = usePermissions();
  const { data: businessData } = useBusinessData();
  const businessId = staffBusinessId || businessData?.business?.id;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const titleMap: Record<string, string> = {
    staff: 'Select Staff',
    customer: 'Select Customer',
    supplier: 'Select Supplier',
    owner: 'Message Business Owner',
  };

  const iconMap: Record<string, any> = {
    staff: Users,
    customer: User,
    supplier: ShoppingCart,
    owner: Briefcase,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (type === 'staff') {
          const result = await getStaff();
          if (result.success && result.staff) {
            setContacts(
              result.staff
                .filter((s: any) => s.id !== staffId)
                .map((s: any) => ({
                  id: s.id,
                  name: s.name || 'Unknown',
                  subtitle: s.role || s.job_role || s.department || 'Staff',
                }))
            );
          }
        } else if (type === 'customer') {
          const result = await getCustomers();
          if (result.success && result.customers) {
            setContacts(
              result.customers.map((c: any) => ({
                id: c.id,
                name: c.name || c.customer_name || 'Unknown',
                subtitle: c.phone || c.mobile || c.email || 'Customer',
              }))
            );
          }
        } else if (type === 'supplier') {
          const result = await getSuppliers();
          if (result.success && result.suppliers) {
            const supplierIds = result.suppliers.map((s: any) => s.id);
            let linkedMap: Record<string, boolean> = {};
            if (supplierIds.length > 0) {
              try {
                const { data: rows } = await supabase
                  .from('suppliers')
                  .select('id, linked_user_id')
                  .in('id', supplierIds);
                if (rows) {
                  rows.forEach((r: any) => {
                    if (r.linked_user_id) linkedMap[r.id] = true;
                  });
                }
              } catch {}
            }
            setContacts(
              result.suppliers.map((s: any) => ({
                id: s.id,
                name: s.business_name || s.contact_person || s.name || 'Unknown',
                subtitle: s.mobile_number || s.phone || s.mobile || s.email || 'Supplier',
                onManager: !!linkedMap[s.id],
              }))
            );
          }
        } else if (type === 'owner') {
          await handleOwnerChat();
          return;
        }
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  const handleOwnerChat = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const { data: ownerRow } = await supabase
        .from('users')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('role', 'Owner')
        .maybeSingle();

      if (!ownerRow) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const convoResult = await getOrCreateConversation({
        businessId,
        otherPartyId: staffId || ownerRow.id,
        otherPartyType: 'staff',
        otherPartyName: staffName || 'Staff',
      });

      if (convoResult.success && convoResult.conversation) {
        router.replace(
          `/chat/conversation?conversationId=${convoResult.conversation.id}&name=${encodeURIComponent(ownerRow.name || 'Business Owner')}&type=owner` as any
        );
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    if (!businessId || creating) return;

    const convoType = (type === 'owner' ? 'staff' : type) as 'staff' | 'customer' | 'supplier';

    if (convoType === 'supplier' && !contact.onManager) {
      Alert.alert(
        'Not on Manager',
        `${contact.name} is not registered on Manager yet. You can reach them via phone, WhatsApp, or other messaging apps.\n\nOnce they sign up on Manager, you'll be able to chat with them here.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setCreating(contact.id);
    try {
      let linkedUserId: string | undefined;
      if (convoType === 'supplier') {
        const uid = await autoLinkSupplierToUser(contact.id);
        if (uid) linkedUserId = uid;
      }

      const result = await getOrCreateConversation({
        businessId,
        otherPartyId: contact.id,
        otherPartyType: convoType,
        otherPartyName: contact.name,
        otherPartyUserId: linkedUserId,
      });

      if (result.success && result.conversation) {
        const isCross = result.crossBusiness === true;
        const displayType = isCross
          ? (convoType === 'supplier' ? 'customer' : convoType === 'customer' ? 'supplier' : convoType)
          : convoType;
        const crossParam = isCross ? '&crossBusiness=true' : '';
        router.replace(
          `/chat/conversation?conversationId=${result.conversation.id}&name=${encodeURIComponent(contact.name)}&type=${displayType}${crossParam}` as any
        );
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setCreating(null);
    }
  };

  const filtered = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q);
  });

  const HeaderIcon = iconMap[type || 'staff'] || Users;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <HeaderIcon size={22} color={Colors.primary} />
        <Text style={styles.headerTitle}>{titleMap[type || 'staff'] || 'New Conversation'}</Text>
      </View>

      {contacts.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          {type === 'owner' && <Text style={{ color: Colors.textLight, marginTop: 12 }}>Opening conversation...</Text>}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <HeaderIcon size={48} color={Colors.grey[300]} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : `No ${type === 'staff' ? 'staff members' : type === 'customer' ? 'customers' : 'suppliers'} found`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : `Add ${type === 'staff' ? 'staff members' : type === 'customer' ? 'customers' : 'suppliers'} first to start a conversation.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSupplierType = type === 'supplier';
            const isOnManager = item.onManager === true;
            return (
              <TouchableOpacity
                style={[styles.contactRow, isSupplierType && !isOnManager && { opacity: 0.55 }]}
                activeOpacity={0.7}
                onPress={() => handleSelectContact(item)}
                disabled={!!creating}
              >
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
                    {isSupplierType && (
                      <View style={[
                        styles.managerBadge,
                        { backgroundColor: isOnManager ? '#ECFDF5' : '#FEF2F2' },
                      ]}>
                        {isOnManager ? (
                          <CheckCircle size={10} color="#059669" />
                        ) : (
                          <XCircle size={10} color="#DC2626" />
                        )}
                        <Text style={[
                          styles.managerBadgeText,
                          { color: isOnManager ? '#059669' : '#DC2626' },
                        ]}>
                          {isOnManager ? 'On Manager' : 'Not on Manager'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {creating === item.id && <ActivityIndicator size="small" color={Colors.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    gap: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, flex: 1 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: Colors.textLight, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  contactSubtitle: { fontSize: 13, color: Colors.textLight },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  managerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
