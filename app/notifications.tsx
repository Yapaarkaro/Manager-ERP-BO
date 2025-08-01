import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Bell, BellRing, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle, Info, Users, Package, ShoppingCart, IndianRupee, Eye, Check, X, MessageSquare } from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0EA5E9',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'order' | 'stock' | 'payment' | 'staff' | 'system' | 'customer';
  title: string;
  message: string;
  timestamp: string;
  status: 'unread' | 'read' | 'acknowledged' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  relatedEntity?: {
    type: 'customer' | 'supplier' | 'product' | 'invoice' | 'staff';
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar: string;
  };
}

const mockNotifications: Notification[] = [
  {
    id: 'NOTIF-001',
    type: 'urgent',
    category: 'order',
    title: 'New High-Value Order Received',
    message: 'New order received from TechCorp Solutions Pvt Ltd worth ₹2,45,000. Requires immediate processing and stock verification.',
    timestamp: '2024-01-16T10:30:00Z',
    status: 'unread',
    priority: 'critical',
    actionRequired: true,
    relatedEntity: {
      type: 'customer',
      id: 'CUST-001',
      name: 'TechCorp Solutions Pvt Ltd'
    },
    createdBy: {
      id: 'SYSTEM',
      name: 'System',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Automated System'
    }
  },
  {
    id: 'NOTIF-002',
    type: 'warning',
    category: 'stock',
    title: 'Critical Stock Alert',
    message: 'iPhone 14 Pro stock has dropped to 3 units. Minimum threshold is 10 units. Immediate restocking required.',
    timestamp: '2024-01-16T09:15:00Z',
    status: 'read',
    priority: 'high',
    actionRequired: true,
    relatedEntity: {
      type: 'product',
      id: 'PROD-001',
      name: 'iPhone 14 Pro 128GB'
    },
    createdBy: {
      id: 'SYSTEM',
      name: 'Inventory System',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Automated System'
    },
    assignedTo: {
      id: 'STAFF-001',
      name: 'Rajesh Kumar',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
    }
  },
  {
    id: 'NOTIF-003',
    type: 'success',
    category: 'payment',
    title: 'Payment Received',
    message: 'Payment of ₹1,25,000 received from Global Enterprises Ltd via UPI. Invoice INV-2024-002 has been marked as paid.',
    timestamp: '2024-01-16T08:45:00Z',
    status: 'acknowledged',
    priority: 'medium',
    actionRequired: false,
    relatedEntity: {
      type: 'invoice',
      id: 'INV-002',
      name: 'INV-2024-002'
    },
    createdBy: {
      id: 'STAFF-002',
      name: 'Priya Sharma',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Sales Executive'
    }
  },
  {
    id: 'NOTIF-004',
    type: 'info',
    category: 'staff',
    title: 'Staff Attendance Update',
    message: 'Amit Singh has marked attendance for today. Current attendance rate: 95%. All staff members are present.',
    timestamp: '2024-01-16T08:00:00Z',
    status: 'read',
    priority: 'low',
    actionRequired: false,
    relatedEntity: {
      type: 'staff',
      id: 'STAFF-003',
      name: 'Amit Singh'
    },
    createdBy: {
      id: 'SYSTEM',
      name: 'HR System',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Automated System'
    }
  },
  {
    id: 'NOTIF-005',
    type: 'warning',
    category: 'customer',
    title: 'Overdue Payment Reminder',
    message: 'Customer Rajesh Kumar has an overdue payment of ₹35,000 for invoice INV-2024-001. Payment is 15 days past due.',
    timestamp: '2024-01-15T16:20:00Z',
    status: 'unread',
    priority: 'high',
    actionRequired: true,
    relatedEntity: {
      type: 'customer',
      id: 'CUST-002',
      name: 'Rajesh Kumar'
    },
    createdBy: {
      id: 'SYSTEM',
      name: 'Accounts System',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Automated System'
    }
  },
  {
    id: 'NOTIF-006',
    type: 'info',
    category: 'system',
    title: 'Daily Sales Report Generated',
    message: 'Daily sales report for January 15, 2024 has been generated. Total sales: ₹88,000 from 12 orders.',
    timestamp: '2024-01-15T23:59:00Z',
    status: 'resolved',
    priority: 'low',
    actionRequired: false,
    createdBy: {
      id: 'SYSTEM',
      name: 'Reporting System',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Automated System'
    }
  },
  {
    id: 'NOTIF-007',
    type: 'urgent',
    category: 'stock',
    title: 'Stock Discrepancy Detected',
    message: 'Stock discrepancy found for MacBook Air M2. Expected: 25 units, Actual: 22 units. Shortage of 3 units detected.',
    timestamp: '2024-01-15T14:30:00Z',
    status: 'acknowledged',
    priority: 'critical',
    actionRequired: true,
    relatedEntity: {
      type: 'product',
      id: 'PROD-003',
      name: 'MacBook Air M2'
    },
    createdBy: {
      id: 'STAFF-003',
      name: 'Amit Singh',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      role: 'Store Manager'
    },
    assignedTo: {
      id: 'STAFF-001',
      name: 'Rajesh Kumar',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
    }
  },
];

export default function NotificationsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotifications, setFilteredNotifications] = useState(mockNotifications);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'urgent' | 'action_required'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const statusOptions = [
    { value: 'unread', label: 'Unread', color: Colors.error },
    { value: 'read', label: 'Read', color: Colors.info },
    { value: 'acknowledged', label: 'Acknowledged', color: Colors.warning },
    { value: 'resolved', label: 'Resolved', color: Colors.success },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = mockNotifications;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(query.toLowerCase()) ||
        notification.message.toLowerCase().includes(query.toLowerCase()) ||
        notification.category.toLowerCase().includes(query.toLowerCase()) ||
        notification.createdBy.name.toLowerCase().includes(query.toLowerCase()) ||
        notification.relatedEntity?.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(notification => {
        switch (filter) {
          case 'unread':
            return notification.status === 'unread';
          case 'urgent':
            return notification.type === 'urgent' || notification.priority === 'critical';
          case 'action_required':
            return notification.actionRequired;
          default:
            return true;
        }
      });
    }

    setFilteredNotifications(filtered);
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return Colors.error;
      case 'warning': return Colors.warning;
      case 'success': return Colors.success;
      case 'info': return Colors.info;
      default: return Colors.textLight;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order': return ShoppingCart;
      case 'stock': return Package;
      case 'payment': return IndianRupee;
      case 'staff': return Users;
      case 'customer': return Users;
      case 'system': return Bell;
      default: return Bell;
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || Colors.textLight;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return Colors.error;
      case 'high': return Colors.warning;
      case 'medium': return Colors.info;
      case 'low': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (!selectedNotification) return;

    setFilteredNotifications(prev =>
      prev.map(notif =>
        notif.id === selectedNotification.id
          ? { ...notif, status: newStatus as Notification['status'] }
          : notif
      )
    );

    setShowStatusModal(false);
    setSelectedNotification(null);
    Alert.alert('Status Updated', `Notification status changed to ${newStatus}`);
  };

  const handleNotifyStaff = () => {
    router.push('/notifications/notify-staff');
  };

  const handleRelatedEntityPress = (notification: Notification) => {
    if (!notification.relatedEntity) return;

    const entity = notification.relatedEntity;
    
    switch (entity.type) {
      case 'customer':
        router.push({
          pathname: '/receivables/customer-details',
          params: {
            customerId: entity.id,
            customerData: JSON.stringify({
              id: entity.id,
              customerName: entity.name,
              totalReceivable: 35000,
              // Add mock data as needed
            })
          }
        });
        break;
      case 'product':
        router.push({
          pathname: '/inventory/product-details',
          params: {
            productId: entity.id,
            productData: JSON.stringify({
              id: entity.id,
              name: entity.name,
              currentStock: 3,
              minStockLevel: 10,
              // Add mock data as needed
            })
          }
        });
        break;
      case 'invoice':
        // Navigate to invoice details
        console.log('Navigate to invoice:', entity.id);
        break;
      default:
        console.log('View entity:', entity.type, entity.id);
    }
  };

  const renderNotificationCard = (notification: Notification) => {
    const NotificationIcon = getNotificationTypeIcon(notification.type);
    const CategoryIcon = getCategoryIcon(notification.category);
    const typeColor = getNotificationTypeColor(notification.type);
    const statusColor = getStatusColor(notification.status);
    const priorityColor = getPriorityColor(notification.priority);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationCard,
          { borderLeftColor: typeColor },
          notification.status === 'unread' && styles.unreadCard
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.notificationHeader}>
          <View style={styles.notificationLeft}>
            <View style={[
              styles.notificationTypeIcon,
              { backgroundColor: `${typeColor}20` }
            ]}>
              <NotificationIcon size={20} color={typeColor} />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle} numberOfLines={2}>
                {notification.title}
              </Text>
              <View style={styles.notificationMeta}>
                <CategoryIcon size={14} color={Colors.textLight} />
                <Text style={styles.notificationCategory}>
                  {notification.category.toUpperCase()}
                </Text>
                <Text style={styles.notificationTime}>
                  • {formatDateTime(notification.timestamp)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.notificationRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: statusColor }
              ]}>
                {notification.status.toUpperCase()}
              </Text>
            </View>
            
            {notification.actionRequired && (
              <View style={styles.actionRequiredBadge}>
                <Text style={styles.actionRequiredText}>ACTION REQUIRED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {notification.message}
          </Text>
        </View>

        {/* Related Entity */}
        {notification.relatedEntity && (
          <TouchableOpacity
            style={styles.relatedEntitySection}
            onPress={() => handleRelatedEntityPress(notification)}
            activeOpacity={0.7}
          >
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.relatedEntityText}>
              View {notification.relatedEntity.type}: {notification.relatedEntity.name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Created By & Assigned To */}
        <View style={styles.assignmentSection}>
          <View style={styles.createdBySection}>
            <Image 
              source={{ uri: notification.createdBy.avatar }}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {notification.createdBy.name}
              </Text>
              <Text style={styles.userRole}>
                {notification.createdBy.role}
              </Text>
            </View>
          </View>

          {notification.assignedTo && (
            <View style={styles.assignedToSection}>
              <Text style={styles.assignedLabel}>Assigned to:</Text>
              <Image 
                source={{ uri: notification.assignedTo.avatar }}
                style={styles.userAvatar}
              />
              <Text style={styles.assignedName}>
                {notification.assignedTo.name}
              </Text>
            </View>
          )}
        </View>

        {/* Priority */}
        <View style={styles.prioritySection}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: `${priorityColor}20` }
          ]}>
            <Text style={[
              styles.priorityText,
              { color: priorityColor }
            ]}>
              {notification.priority.toUpperCase()} PRIORITY
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getFilterCounts = () => {
    return {
      all: mockNotifications.length,
      unread: mockNotifications.filter(n => n.status === 'unread').length,
      urgent: mockNotifications.filter(n => n.type === 'urgent' || n.priority === 'critical').length,
      action_required: mockNotifications.filter(n => n.actionRequired).length,
    };
  };

  const filterCounts = getFilterCounts();

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
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredNotifications.length} notifications
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <BellRing size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Unread</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {filterCounts.unread}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Urgent</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {filterCounts.urgent}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Clock size={20} color={Colors.info} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Action Required</Text>
            <Text style={[styles.summaryValue, { color: Colors.info }]}>
              {filterCounts.action_required}
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
            { key: 'all', label: 'All', count: filterCounts.all },
            { key: 'unread', label: 'Unread', count: filterCounts.unread },
            { key: 'urgent', label: 'Urgent', count: filterCounts.urgent },
            { key: 'action_required', label: 'Action Required', count: filterCounts.action_required },
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

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Notifications Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No notifications match your search criteria' : 'All caught up! No new notifications.'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map(renderNotificationCard)
        )}
      </ScrollView>

      {/* Notify Staff FAB */}
      <TouchableOpacity
        style={styles.notifyStaffFAB}
        onPress={handleNotifyStaff}
        activeOpacity={0.8}
      >
        <MessageSquare size={20} color="#ffffff" />
        <Text style={styles.notifyStaffText}>Notify Staff</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notifications..."
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

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Notification Status</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStatusModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedNotification && (
              <View style={styles.modalContent}>
                <Text style={styles.modalNotificationTitle}>
                  {selectedNotification.title}
                </Text>
                <Text style={styles.modalNotificationMessage}>
                  {selectedNotification.message}
                </Text>

                <View style={styles.statusOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        selectedNotification.status === option.value && styles.selectedStatusOption
                      ]}
                      onPress={() => handleStatusUpdate(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.statusOptionIndicator,
                        { backgroundColor: option.color }
                      ]} />
                      <Text style={[
                        styles.statusOptionText,
                        selectedNotification.status === option.value && styles.selectedStatusOptionText
                      ]}>
                        {option.label}
                      </Text>
                      {selectedNotification.status === option.value && (
                        <Check size={20} color={option.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    color: Colors.primary,
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
  notificationCard: {
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
  unreadCard: {
    backgroundColor: '#fefefe',
    borderColor: Colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  notificationTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationCategory: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.textLight,
  },
  notificationRight: {
    alignItems: 'flex-end',
    gap: 6,
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
  actionRequiredBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionRequiredText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.error,
  },
  messageSection: {
    marginBottom: 12,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  relatedEntitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  relatedEntityText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  assignmentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createdBySection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  userRole: {
    fontSize: 10,
    color: Colors.textLight,
  },
  assignedToSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedLabel: {
    fontSize: 10,
    color: Colors.textLight,
  },
  assignedName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text,
  },
  prioritySection: {
    alignItems: 'flex-start',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notifyStaffFAB: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: Colors.success,
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
  notifyStaffText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalNotificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalNotificationMessage: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 20,
  },
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.grey[50],
    gap: 12,
  },
  selectedStatusOption: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  statusOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedStatusOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});