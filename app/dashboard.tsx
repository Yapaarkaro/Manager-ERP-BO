import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Menu, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  RotateCcw, 
  Package, 
  CreditCard, 
  IndianRupee, 
  Bell, 
  Users, 
  TriangleAlert as AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CircleAlert as AlertCircle,
  ChevronDown,
  ChevronUp,
  PackageMinus,
  PackagePlus
} from 'lucide-react-native';
import HamburgerMenu from '@/components/HamburgerMenu';
import FAB from '@/components/FAB';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#4F46E5',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  orange: '#EA580C',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

// Platform-specific shadow utilities
const getShadowStyle = (elevation: number = 2) => ({
  shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
  shadowOffset: Platform.OS === 'ios' ? { width: 0, height: elevation } : undefined,
  shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
  shadowRadius: Platform.OS === 'ios' ? elevation * 2 : undefined,
  elevation: Platform.OS === 'android' ? elevation : undefined,
});

// Platform-specific font utilities
const getFontStyles = () => ({
  header: {
    fontSize: Platform.OS === 'ios' ? 18 : 18,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 16 : 16,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  body: {
    fontSize: Platform.OS === 'ios' ? 14 : 14,
    fontWeight: '500' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  caption: {
    fontSize: Platform.OS === 'ios' ? 12 : 12,
    fontWeight: '500' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
});

// Platform-specific touch feedback utilities
const getTouchProps = () => ({
  activeOpacity: 0.7,
  delayPressIn: Platform.OS === 'android' ? 50 : 0,
  delayPressOut: Platform.OS === 'android' ? 50 : 0,
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const [isLastWeekExpanded, setIsLastWeekExpanded] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const userName = 'John Doe';
  const businessName = 'ABC Electronics';
  
  const debouncedNavigate = useDebounceNavigation(500);

  const handleMenuPress = () => {
    setShowHamburgerMenu(true);
  };

  const handleSalesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/sales');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleReceivablesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/receivables');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handlePayablesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/payables');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleLowStockPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/inventory/low-stock');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleReturnsPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/returns');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleNotificationsPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/notifications');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleSalesOverviewPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/reports');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleStaffPress = (staffId: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/people/staff');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleStockDiscrepancyPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/inventory/stock-discrepancies');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const toggleLastWeekExpansion = () => {
    setIsLastWeekExpanded(!isLastWeekExpanded);
  };

  const handleMenuNavigation = (route: any) => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate(route);
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleFABAction = (action: string) => {
    console.log('FAB action:', action);
  };

  // Render greeting section
  const renderGreeting = () => (
    <View style={styles.greetingSection}>
      <Text style={styles.greeting}>
        {getGreeting()}, {userName}
      </Text>
      <Text style={styles.greetingSubtext}>
        Welcome to {businessName}
      </Text>
    </View>
  );

  // Render KPI cards section
  const renderKPICards = () => (
    <View style={styles.kpiContainer}>
      <TouchableWithoutFeedback onPress={handleSalesPress} disabled={isNavigating}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Total Sales</Text>
            <ShoppingCart size={20} color={Colors.success} />
          </View>
          <Text style={[styles.kpiAmount, { color: Colors.success }]}>₹1,25,000</Text>
          <View style={styles.kpiFooter}>
            <TrendingUp size={16} color={Colors.success} />
            <Text style={[styles.kpiChange, { color: Colors.success }]}>12.5%</Text>
            <Text style={styles.kpiPeriod}>vs same day last month</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback onPress={handleReturnsPress} disabled={isNavigating}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Returns</Text>
            <RotateCcw size={20} color={Colors.error} />
          </View>
          <Text style={[styles.kpiAmount, { color: Colors.error }]}>₹8,500</Text>
          <View style={styles.kpiFooter}>
            <TrendingDown size={16} color={Colors.success} />
            <Text style={[styles.kpiChange, { color: Colors.success }]}>3.2%</Text>
            <Text style={styles.kpiPeriod}>decline vs last month</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback onPress={handleLowStockPress} disabled={isNavigating}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Low Stock Items</Text>
            <AlertTriangle size={20} color={Colors.error} />
          </View>
          <Text style={[styles.kpiAmount, { color: Colors.error }]}>23</Text>
          <View style={styles.kpiFooter}>
            <AlertTriangle size={16} color={Colors.warning} />
            <Text style={[styles.kpiChange, { color: Colors.warning }]}>15.8%</Text>
            <Text style={styles.kpiPeriod}>of stock needs attention</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback onPress={handleReceivablesPress} disabled={isNavigating}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Receivables</Text>
            <ArrowDownLeft size={20} color={Colors.success} />
          </View>
          <Text style={[styles.kpiAmount, { color: Colors.success }]}>₹45,000</Text>
          <View style={styles.kpiFooter}>
            <TrendingUp size={16} color={Colors.success} />
            <Text style={[styles.kpiChange, { color: Colors.success }]}>8.7%</Text>
            <Text style={styles.kpiPeriod}>from 8 unpaid invoices</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback onPress={handlePayablesPress} disabled={isNavigating}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Payables</Text>
            <ArrowUpRight size={20} color={Colors.error} />
          </View>
          <Text style={[styles.kpiAmount, { color: Colors.error }]}>₹32,000</Text>
          <View style={styles.kpiFooter}>
            <TrendingDown size={16} color={Colors.error} />
            <Text style={[styles.kpiChange, { color: Colors.error }]}>5.4%</Text>
            <Text style={styles.kpiPeriod}>due to 12 suppliers</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );

  // Render stock discrepancies section
  const renderStockDiscrepancies = () => (
    <View style={styles.section}>
      <TouchableWithoutFeedback onPress={handleStockDiscrepancyPress} disabled={isNavigating}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stock Discrepancies</Text>
          <AlertTriangle size={20} color={Colors.text} />
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.discrepancyList}>
        {([
          { 
            product: 'iPhone 14 Pro',
            expected: 100,
            actual: 95,
            type: 'shortage' as const,
            supplier: {
              name: 'Apple India Pvt Ltd',
              id: 'SUP001'
            },
            staff: {
              name: 'Rajesh Kumar',
              avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
            }
          },
          { 
            product: 'Samsung Galaxy S23',
            expected: 50,
            actual: 52,
            type: 'excess' as const,
            supplier: {
              name: 'Samsung Electronics',
              id: 'SUP002'
            },
            staff: {
              name: 'Priya Sharma',
              avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
            }
          }
        ] as const).map((item, index) => (
          <TouchableWithoutFeedback key={index} onPress={handleStockDiscrepancyPress} disabled={isNavigating}>
            <View style={[
              styles.discrepancyItem,
              item.type === 'shortage' ? styles.shortageItem : styles.excessItem
            ]}>
              <View style={styles.discrepancyHeader}>
                <Text style={styles.discrepancyProduct}>{item.product}</Text>
                {item.type === 'shortage' ? (
                  <PackageMinus size={20} color={Colors.error} />
                ) : (
                  <PackagePlus size={20} color={Colors.orange} />
                )}
              </View>
              <View style={styles.discrepancyDetails}>
                <View style={styles.discrepancyInfo}>
                  <Text style={styles.discrepancyText}>
                    Expected: {item.expected} • Actual: {item.actual}
                  </Text>
                  <Text style={styles.supplierName}>{item.supplier.name}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Image 
                    source={{ uri: item.staff.avatar }}
                    style={styles.staffAvatar}
                  />
                  <Text style={[
                    styles.discrepancyDiff,
                    item.type === 'shortage' ? styles.shortageText : styles.excessText
                  ]}>
                    {item.type === 'shortage' ? '-' : '+'}
                    {Math.abs(item.actual - item.expected)} units
                  </Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    </View>
  );

  // Render notifications section
  const renderNotifications = () => (
    <View style={styles.section}>
      <TouchableWithoutFeedback onPress={handleNotificationsPress} disabled={isNavigating}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notification Center</Text>
          <Bell size={20} color={Colors.text} />
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.notificationList}>
        {([
          { 
            type: 'urgent' as const, 
            message: 'New order received from customer #1234. Order value: ₹5,500', 
            time: '2h ago',
            staff: {
              name: 'Rajesh Kumar',
              avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
            }
          },
          { 
            type: 'warning' as const, 
            message: 'Low stock alert: iPhone 14 Pro has only 3 units left', 
            time: '4h ago',
            staff: {
              name: 'System',
              avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
            }
          },
          { 
            type: 'info' as const, 
            message: 'Payment of ₹12,000 received from customer #5678', 
            time: '6h ago',
            staff: {
              name: 'Priya Sharma',
              avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
            }
          },
        ] as const).map((notification, index) => (
          <TouchableWithoutFeedback key={index} onPress={handleNotificationsPress} disabled={isNavigating}>
            <View style={styles.notificationItem}>
              <View style={[
                styles.notificationIcon,
                notification.type === 'urgent' ? styles.urgentIcon :
                notification.type === 'warning' ? styles.warningIcon :
                styles.infoIcon
              ]}>
                {notification.type === 'urgent' ? (
                  <AlertTriangle size={16} color={Colors.success} />
                ) : notification.type === 'warning' ? (
                  <AlertCircle size={16} color={Colors.warning} />
                ) : (
                  <Bell size={16} color={Colors.primary} />
                )}
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationText}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <View style={styles.staffInfo}>
                    <Image 
                      source={{ uri: notification.staff.avatar }}
                      style={styles.staffAvatar}
                    />
                    <Text style={styles.staffName}>{notification.staff.name}</Text>
                  </View>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    </View>
  );

  // Render staff performance section
  const renderStaffPerformance = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff Performance</Text>
        <Users size={20} color={Colors.text} />
      </View>
      <View style={styles.staffList}>
        {[
          {
            id: 'STAFF001',
            name: 'Rajesh Kumar',
            image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
            attendance: '95%',
            sales: '₹45,000',
            invoices: 28,
            score: 92
          },
          {
            id: 'STAFF002',
            name: 'Priya Sharma',
            image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
            attendance: '88%',
            sales: '₹38,000',
            invoices: 22,
            score: 85
          },
          {
            id: 'STAFF003',
            name: 'Amit Singh',
            image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
            attendance: '92%',
            sales: '₹52,000',
            invoices: 31,
            score: 89
          },
        ].map((staff) => (
          <TouchableWithoutFeedback key={staff.id} onPress={() => handleStaffPress(staff.id)} disabled={isNavigating}>
            <View style={styles.staffCard}>
              <View style={styles.staffHeader}>
                <Image source={{ uri: staff.image }} style={styles.staffImage} />
                <View>
                  <Text style={styles.staffNameText}>{staff.name}</Text>
                  <Text style={styles.staffAttendance}>
                    Attendance: {staff.attendance}
                  </Text>
                </View>
              </View>
              <View style={styles.staffStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sales</Text>
                  <Text style={styles.statValue}>{staff.sales}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Invoices</Text>
                  <Text style={styles.statValue}>{staff.invoices}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Score</Text>
                  <Text style={[styles.statValue, styles.scoreValue]}>{staff.score}/100</Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    </View>
  );

  // Render business overview section
  const renderBusinessOverview = () => (
    <View style={[styles.section, styles.lastSection]}>
      <Text style={styles.sectionTitle}>Business Overview</Text>

      <TouchableWithoutFeedback onPress={handleSalesOverviewPress} disabled={isNavigating}>
        <View style={styles.salesOverview}>
          <View style={styles.periodSection}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>Today</Text>
              <View style={styles.periodStats}>
                <Text style={styles.periodAmount}>₹88,000</Text>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderCount}>12 orders</Text>
                </View>
              </View>
            </View>
            <View style={styles.trendContainer}>
              <TrendingUp size={16} color={Colors.success} />
              <Text style={[styles.trendValue, styles.positive]}>12.5%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentMethods}>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentAmount}>₹25,000</Text>
            </View>

            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>UPI</Text>
              <Text style={styles.paymentAmount}>₹45,000</Text>
            </View>

            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>Card</Text>
              <Text style={styles.paymentAmount}>₹18,000</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableWithoutFeedback onPress={toggleLastWeekExpansion}>
            <View style={styles.periodSection}>
              <View style={styles.expandableHeader}>
                <View style={styles.periodHeader}>
                  <Text style={styles.periodTitle}>Last Week</Text>
                  <View style={styles.periodStats}>
                    <Text style={styles.periodAmount}>₹1,95,000</Text>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderCount}>65 orders</Text>
                    </View>
                  </View>
                </View>
                {isLastWeekExpanded ? (
                  <ChevronUp size={20} color={Colors.text} />
                ) : (
                  <ChevronDown size={20} color={Colors.text} />
                )}
              </View>
              <View style={styles.trendContainer}>
                <TrendingUp size={16} color={Colors.success} />
                <Text style={[styles.trendValue, styles.positive]}>8.7%</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>

          {isLastWeekExpanded && (
            <>
              <View style={styles.divider} />
              <View style={styles.dayWiseSection}>
                <Text style={styles.dayWiseTitle}>Day-wise Sales</Text>
                {[
                  { day: 'Monday', amount: '₹28,000', orders: 12 },
                  { day: 'Tuesday', amount: '₹32,500', orders: 14 },
                  { day: 'Wednesday', amount: '₹25,800', orders: 11 },
                  { day: 'Thursday', amount: '₹35,200', orders: 16 },
                  { day: 'Friday', amount: '₹42,000', orders: 18 },
                  { day: 'Saturday', amount: '₹31,500', orders: 13 },
                ].map((dayData, index) => (
                  <View key={index} style={styles.dayWiseItem}>
                    <Text style={styles.dayName}>{dayData.day}</Text>
                    <View style={styles.dayStats}>
                      <Text style={styles.dayAmount}>{dayData.amount}</Text>
                      <Text style={styles.dayOrders}>{dayData.orders} orders</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );

  // Dashboard sections data
  const dashboardSections = [
    { id: 'greeting', render: renderGreeting },
    { id: 'kpi', render: renderKPICards },
    { id: 'discrepancies', render: renderStockDiscrepancies },
    { id: 'notifications', render: renderNotifications },
    { id: 'staff', render: renderStaffPerformance },
    { id: 'overview', render: renderBusinessOverview },
  ];

  const renderSection = ({ item }: { item: { id: string; render: () => React.ReactElement } }) => {
    return item.render();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableWithoutFeedback onPress={handleMenuPress}>
          <View style={styles.menuButton}>
            <Menu size={24} color={Colors.text} />
          </View>
        </TouchableWithoutFeedback>
        
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <FlatList
        data={dashboardSections}
        renderItem={renderSection}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={10}
      />

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={showHamburgerMenu}
        onClose={() => setShowHamburgerMenu(false)}
        onNavigate={handleMenuNavigation}
      />

      {/* FAB */}
      <FAB onAction={handleFABAction} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatListContent: {
    paddingBottom: 100,
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
  greetingSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: Colors.grey[100],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    ...getFontStyles().header,
    color: Colors.text,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 16,
    color: Colors.textLight,
  },
  kpiContainer: {
    padding: 16,
    gap: 16,
    backgroundColor: Colors.background,
  },
  kpiCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    ...getShadowStyle(2),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    ...getFontStyles().body,
    color: Colors.textLight,
  },
  kpiAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  kpiChange: {
    ...getFontStyles().body,
    fontWeight: '600',
  },
  kpiPeriod: {
    ...getFontStyles().caption,
    color: Colors.textLight,
    marginLeft: 4,
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
  warning: {
    color: Colors.warning,
  },
  section: {
    marginTop: 8,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 8,
    borderTopColor: Colors.grey[100],
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  sectionTitle: {
    ...getFontStyles().header,
    color: Colors.text,
  },
  notificationList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 12,
    ...getShadowStyle(1),
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentIcon: {
    backgroundColor: '#DCFCE7',
  },
  warningIcon: {
    backgroundColor: '#FEF3C7',
  },
  infoIcon: {
    backgroundColor: '#DBEAFE',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  discrepancyList: {
    gap: 12,
  },
  discrepancyItem: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    ...getShadowStyle(1),
  },
  shortageItem: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  excessItem: {
    borderColor: Colors.orange,
    backgroundColor: '#FFF7ED',
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discrepancyProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  discrepancyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discrepancyInfo: {
    flex: 1,
  },
  discrepancyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  discrepancyDiff: {
    fontSize: 14,
    fontWeight: '600',
  },
  shortageText: {
    color: Colors.error,
  },
  excessText: {
    color: Colors.orange,
  },
  supplierName: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  staffList: {
    gap: 16,
  },
  staffCard: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    ...getShadowStyle(2),
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  staffImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  staffNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffAttendance: {
    fontSize: 14,
    color: Colors.textLight,
  },
  staffStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  scoreValue: {
    color: Colors.success,
  },
  salesOverview: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
    ...getShadowStyle(2),
  },
  periodSection: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodHeader: {
    marginBottom: 8,
    flex: 1,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  periodStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  orderBadge: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
  },
  paymentMethods: {
    padding: 16,
    gap: 12,
    backgroundColor: Colors.grey[50],
  },
  paymentMethod: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    ...getShadowStyle(1),
  },
  paymentTitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  dayWiseSection: {
    padding: 16,
    backgroundColor: Colors.grey[50],
  },
  dayWiseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dayWiseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  dayName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  dayAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dayOrders: {
    fontSize: 12,
    color: Colors.textLight,
  },
});