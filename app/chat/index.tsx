import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Search, Plus, MessageSquare, Users, ShoppingCart, User, Briefcase } from 'lucide-react-native';
import { usePermissions } from '@/contexts/PermissionContext';
import { getConversations, getStaff } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { useBusinessData } from '@/hooks/useBusinessData';
import { safeRouter } from '@/utils/safeRouter';

const Colors = {
  primary: '#3f66ac',
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  success: '#059669',
  error: '#DC2626',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  },
};

const ALL_TABS = ['All', 'Owner', 'Staff', 'Customers', 'Suppliers'] as const;
type Tab = (typeof ALL_TABS)[number];

const TAB_ICONS: Record<Tab, React.ComponentType<any>> = {
  All: MessageSquare,
  Owner: Briefcase,
  Staff: Users,
  Customers: User,
  Suppliers: ShoppingCart,
};

const TAB_TYPE_MAP: Record<Tab, string | null> = {
  All: null,
  Owner: 'owner',
  Staff: 'staff',
  Customers: 'customer',
  Suppliers: 'supplier',
};

interface Conversation {
  id: string;
  business_id: string;
  type: 'staff' | 'customer' | 'supplier';
  participant_owner_id: string | null;
  participant_other_id: string;
  participant_other_type: 'staff' | 'customer' | 'supplier';
  participant_other_name: string;
  participant_other_avatar: string | null;
  participant_other_user_id: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count_owner: number;
  unread_count_other: number;
  created_at: string;
  _crossBusiness?: boolean;
  _buyerBusinessName?: string;
  _buyerOwnerName?: string;
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
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ChatListScreen() {
  const { data } = useBusinessData();
  const { isStaff, isOwner, staffId, staffBusinessId, hasPermission } = usePermissions();
  const businessId = staffBusinessId || data?.business?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [fabExpanded, setFabExpanded] = useState(false);
  const [ownerName, setOwnerName] = useState<string>('Business Owner');
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isStaff || !businessId) return;
    supabase
      .from('users')
      .select('name')
      .eq('business_id', businessId)
      .eq('role', 'Owner')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setOwnerName(data.name);
      });
  }, [isStaff, businessId]);

  const visibleTabs: Tab[] = isStaff
    ? (['All', 'Owner', 'Customers', 'Suppliers'] as Tab[])
    : (['All', 'Staff', 'Customers', 'Suppliers'] as Tab[]);

  const getDisplayName = useCallback((convo: Conversation) => {
    if (convo._crossBusiness) {
      return convo._buyerBusinessName || 'Business';
    }
    if (isStaff && convo.participant_other_type === 'staff' && convo.participant_other_id === staffId) {
      return ownerName;
    }
    return convo.participant_other_name;
  }, [isStaff, staffId, ownerName]);

  const getDisplayType = useCallback((convo: Conversation): string => {
    if (convo._crossBusiness) {
      if (convo.participant_other_type === 'supplier') return 'customer';
      if (convo.participant_other_type === 'customer') return 'supplier';
      return convo.participant_other_type;
    }
    if (isStaff && convo.participant_other_type === 'staff' && convo.participant_other_id === staffId) {
      return 'owner' as const;
    }
    return convo.participant_other_type;
  }, [isStaff, staffId]);

  const loadConversations = useCallback(async () => {
    if (!businessId) return;
    const result = await getConversations(businessId);
    if (result.success && result.conversations) {
      const convos = result.conversations;

      const staffConvos = convos.filter((c: any) => c.participant_other_type === 'staff');
      if (staffConvos.length > 0) {
        const staffIds = staffConvos.map((c: any) => c.participant_other_id);
        const { data: staffRows } = await supabase
          .from('staff')
          .select('id, name')
          .in('id', staffIds);
        if (staffRows) {
          const nameMap = new Map(staffRows.map((s: any) => [s.id, s.name]));
          for (const c of convos) {
            if (c.participant_other_type === 'staff' && nameMap.has(c.participant_other_id)) {
              const realName = nameMap.get(c.participant_other_id);
              if (realName && realName !== c.participant_other_name) {
                c.participant_other_name = realName;
                supabase
                  .from('conversations')
                  .update({ participant_other_name: realName })
                  .eq('id', c.id)
                  .then(() => {});
              }
            }
          }
        }
      }

      const supplierConvos = convos.filter((c: any) => c.participant_other_type === 'supplier' && !c._crossBusiness);
      if (supplierConvos.length > 0) {
        const supplierIds = supplierConvos.map((c: any) => c.participant_other_id);
        const { data: supplierRows } = await supabase
          .from('suppliers')
          .select('id, business_name, contact_person')
          .in('id', supplierIds);
        if (supplierRows) {
          const nameMap = new Map(supplierRows.map((s: any) => [s.id, s.business_name || s.contact_person]));
          for (const c of convos) {
            if (c.participant_other_type === 'supplier' && nameMap.has(c.participant_other_id)) {
              const realName = nameMap.get(c.participant_other_id);
              if (realName && realName !== c.participant_other_name) {
                c.participant_other_name = realName;
                supabase
                  .from('conversations')
                  .update({ participant_other_name: realName })
                  .eq('id', c.id)
                  .then(() => {});
              }
            }
          }
        }
      }

      const customerConvos = convos.filter((c: any) => c.participant_other_type === 'customer' && !c._crossBusiness);
      if (customerConvos.length > 0) {
        const customerIds = customerConvos.map((c: any) => c.participant_other_id);
        const { data: customerRows } = await supabase
          .from('customers')
          .select('id, name, business_name')
          .in('id', customerIds);
        if (customerRows) {
          const nameMap = new Map(customerRows.map((cu: any) => [cu.id, cu.business_name || cu.name]));
          for (const c of convos) {
            if (c.participant_other_type === 'customer' && nameMap.has(c.participant_other_id)) {
              const realName = nameMap.get(c.participant_other_id);
              if (realName && realName !== c.participant_other_name) {
                c.participant_other_name = realName;
                supabase
                  .from('conversations')
                  .update({ participant_other_name: realName })
                  .eq('id', c.id)
                  .then(() => {});
              }
            }
          }
        }
      }

      setConversations(convos);
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations().finally(() => setLoading(false));
    }, [loadConversations])
  );

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`conversations:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const channels = [channel];

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const crossChannel = supabase
          .channel(`cross-conversations:${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
            },
            () => {
              loadConversations();
            }
          )
          .subscribe();
        channels.push(crossChannel);
      }
    })();

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [businessId, loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const filteredConversations = conversations.filter((c) => {
    const typeFilter = TAB_TYPE_MAP[selectedTab];
    if (typeFilter) {
      const effectiveType = getDisplayType(c);
      if (effectiveType !== typeFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const effectiveName = getDisplayName(c);
      return (
        effectiveName?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleFab = () => {
    const willExpand = !fabExpanded;
    Animated.spring(fabAnim, {
      toValue: willExpand ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      tension: 120,
      friction: 10,
    }).start();
    setFabExpanded(willExpand);
  };

  const handleNewChat = (type: 'staff' | 'customer' | 'supplier' | 'owner') => {
    setFabExpanded(false);
    Animated.spring(fabAnim, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
      tension: 120,
      friction: 10,
    }).start();
    safeRouter.push(`/chat/new-conversation?type=${type}` as any);
  };

  const openConversation = (conversation: Conversation) => {
    const displayName = getDisplayName(conversation);
    const displayType = getDisplayType(conversation);
    const crossParam = conversation._crossBusiness ? '&crossBusiness=true' : '';
    const partyParam = conversation.participant_other_id ? `&otherPartyId=${conversation.participant_other_id}` : '';
    safeRouter.push(
      `/chat/conversation?conversationId=${conversation.id}&name=${encodeURIComponent(displayName)}&type=${displayType}${crossParam}${partyParam}` as any
    );
  };

  const unreadCount = (c: Conversation) => {
    if (c._crossBusiness) return c.unread_count_other || 0;
    return isStaff ? c.unread_count_other : c.unread_count_owner;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const unread = unreadCount(item);
    const displayName = getDisplayName(item);
    const displayType = getDisplayType(item);
    return (
      <TouchableOpacity
        style={[styles.conversationRow, unread > 0 && styles.conversationUnread]}
        activeOpacity={0.7}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(displayName) }]}>
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, unread > 0 && styles.textBold]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.conversationTime, unread > 0 && { color: Colors.primary }]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text style={[styles.conversationPreview, unread > 0 && styles.previewBold]} numberOfLines={1}>
              {item.last_message_text || 'No messages yet'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
          <View style={styles.typeBadgeRow}>
            <View style={[styles.typeBadge, typeStyle(displayType)]}>
              <Text style={[styles.typeBadgeText, typeTextStyle(displayType)]}>
                {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const fabActions = (() => {
    const actions: { type: 'staff' | 'customer' | 'supplier' | 'owner'; label: string; Icon: any }[] = [];
    if (isStaff) {
      actions.push({ type: 'owner', label: 'Owner', Icon: Briefcase });
      if (hasPermission('master_access') || hasPermission('staff_management')) {
        actions.push({ type: 'staff', label: 'Staff', Icon: Users });
      }
      if (hasPermission('master_access') || hasPermission('sales') || hasPermission('payment_processing')) {
        actions.push({ type: 'customer', label: 'Customer', Icon: User });
      }
      if (hasPermission('master_access') || hasPermission('inventory') || hasPermission('payment_processing')) {
        actions.push({ type: 'supplier', label: 'Supplier', Icon: ShoppingCart });
      }
    } else {
      actions.push({ type: 'staff', label: 'Staff', Icon: Users });
      actions.push({ type: 'customer', label: 'Customer', Icon: User });
      actions.push({ type: 'supplier', label: 'Supplier', Icon: ShoppingCart });
    }
    return actions.reverse();
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.tabContainer}
      >
        {visibleTabs.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const isActive = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
            >
              <Icon size={16} color={isActive ? Colors.primary : Colors.textLight} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MessageSquare size={48} color={Colors.grey[300]} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No conversations yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : 'Tap the + button to start a conversation with your staff, customers, or suppliers.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        />
      )}

      {/* FAB Overlay */}
      {fabExpanded && (
        <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={toggleFab} />
      )}

      {/* FAB Actions */}
      {fabExpanded &&
        fabActions.map((action, index) => {
          const translateY = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(60 * (fabActions.length - index))],
          });
          const opacity = fabAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          });
          const scale = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
          });
          return (
            <Animated.View
              key={action.type}
              style={[
                styles.fabAction,
                { transform: [{ translateY }, { scale }], opacity },
              ]}
            >
              <TouchableOpacity style={styles.fabActionLabel} onPress={() => handleNewChat(action.type)} activeOpacity={0.8}>
                <Text style={styles.fabActionText}>{action.label}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabActionIcon} onPress={() => handleNewChat(action.type)} activeOpacity={0.8}>
                <action.Icon size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

      {/* Main FAB */}
      <TouchableOpacity style={styles.fab} onPress={toggleFab} activeOpacity={0.8}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          <Plus size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function typeStyle(type: string) {
  switch (type) {
    case 'owner':
      return { backgroundColor: '#F0F4FF' };
    case 'staff':
      return { backgroundColor: '#EEF2FF' };
    case 'customer':
      return { backgroundColor: '#ECFDF5' };
    case 'supplier':
      return { backgroundColor: '#FFF7ED' };
    default:
      return { backgroundColor: Colors.grey[100] };
  }
}

function typeTextStyle(type: string) {
  switch (type) {
    case 'owner':
      return { color: '#1E40AF' };
    case 'staff':
      return { color: '#4338CA' };
    case 'customer':
      return { color: '#059669' };
    case 'supplier':
      return { color: '#EA580C' };
    default:
      return { color: Colors.textLight };
  }
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
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
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 5,
  },
  tabActive: {
    backgroundColor: '#EBF0F9',
    borderColor: Colors.primary + '40',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  conversationUnread: {
    backgroundColor: '#F8FAFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  textBold: {
    fontWeight: '700',
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    color: Colors.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  typeBadgeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  fabBackdrop: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: Platform.OS === 'web' ? 0 : -1000,
    left: Platform.OS === 'web' ? 0 : -1000,
    right: Platform.OS === 'web' ? 0 : -1000,
    bottom: Platform.OS === 'web' ? 0 : -1000,
    ...(Platform.OS === 'web' ? { width: '100vw' as any, height: '100vh' as any } : {}),
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  fabAction: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1001,
  },
  fabActionLabel: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1002,
  },
});
