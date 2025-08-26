import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
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
  const userName = 'John Doe'; // This would come from user data
  const businessName = 'ABC Electronics'; // This would come from business data
  
  // Use debounced navigation for all KPI cards
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
    // Add FAB action logic here
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Menu size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            {getGreeting()}, {userName}
          </Text>
          <Text style={styles.greetingSubtext}>
            Welcome to {businessName}
          </Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <TouchableOpacity 
            style={[
              styles.kpiCard, 
              styles.salesCard,
              isNavigating && styles.kpiCardDisabled
            ]}
            onPress={handleSalesPress}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Total Sales</Text>
              <ShoppingCart size={20} color={Colors.success} />
            </View>
            <Text style={[styles.kpiAmount, styles.salesAmount]}>₹1,25,000</Text>
            <View style={styles.kpiFooter}>
              <TrendingUp size={16} color={Colors.success} />
              <Text style={[styles.kpiChange, styles.positive]}>12.5%</Text>
              <Text style={styles.kpiPeriod}>vs same day last month</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.kpiCard, 
              styles.returnsCard,
              isNavigating && styles.kpiCardDisabled
            ]}
            onPress={handleReturnsPress}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Returns</Text>
              <RotateCcw size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, styles.returnsAmount]}>₹8,500</Text>
            <View style={styles.kpiFooter}>
              <TrendingDown size={16} color={Colors.success} />
              <Text style={[styles.kpiChange, styles.positive]}>3.2%</Text>
              <Text style={styles.kpiPeriod}>decline vs last month</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.kpiCard, 
              styles.stockCard,
              isNavigating && styles.kpiCardDisabled
            ]}
            onPress={handleLowStockPress}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Low Stock Items</Text>
              <AlertTriangle size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, styles.stockAmount]}>23</Text>
            <View style={styles.kpiFooter}>
              <AlertTriangle size={16} color={Colors.warning} />
              <Text style={[styles.kpiChange, styles.warning]}>15.8%</Text>
              <Text style={styles.kpiPeriod}>of stock needs attention</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.kpiCard, 
              styles.receivablesCard,
              isNavigating && styles.kpiCardDisabled
            ]}
            onPress={handleReceivablesPress}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Receivables</Text>
              <ArrowDownLeft size={20} color={Colors.success} />
            </View>
            <Text style={[styles.kpiAmount, styles.receivablesAmount]}>₹45,000</Text>
            <View style={styles.kpiFooter}>
              <TrendingUp size={16} color={Colors.success} />
              <Text style={[styles.kpiChange, styles.positive]}>8.7%</Text>
              <Text style={styles.kpiPeriod}>from 8 unpaid invoices</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.kpiCard, 
              styles.payablesCard,
              isNavigating && styles.kpiCardDisabled
            ]}
            onPress={handlePayablesPress}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Payables</Text>
              <ArrowUpRight size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, styles.payablesAmount]}>₹32,000</Text>
            <View style={styles.kpiFooter}>
              <TrendingDown size={16} color={Colors.error} />
              <Text style={[styles.kpiChange, styles.negative]}>5.4%</Text>
              <Text style={styles.kpiPeriod}>due to 12 suppliers</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stock Discrepancies */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={handleStockDiscrepancyPress}
            disabled={isNavigating}
          >
            <Text style={styles.sectionTitle}>Stock Discrepancies</Text>
            <AlertTriangle size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.discrepancyList}>
            {[
              { 
                product: 'iPhone 14 Pro',
                expected: 100,
                actual: 95,
                type: 'shortage',
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
                type: 'excess',
                supplier: {
                  name: 'Samsung Electronics',
                  id: 'SUP002'
                },
                staff: {
                  name: 'Priya Sharma',
                  avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
                }
              }
            ].map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.discrepancyItem,
                  item.type === 'shortage' ? styles.shortageItem : styles.excessItem
                ]}
                onPress={handleStockDiscrepancyPress}
                disabled={isNavigating}
              >
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
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={handleNotificationsPress}
            disabled={isNavigating}
          >
            <Text style={styles.sectionTitle}>Notification Center</Text>
            <Bell size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.notificationList}>
            {[
              { 
                type: 'urgent', 
                message: 'New order received from customer #1234. Order value: ₹5,500', 
                time: '2h ago',
                staff: {
                  name: 'Rajesh Kumar',
                  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
                }
              },
              { 
                type: 'warning', 
                message: 'Low stock alert: iPhone 14 Pro has only 3 units left', 
                time: '4h ago',
                staff: {
                  name: 'System',
                  avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
                }
              },
              { 
                type: 'info', 
                message: 'Payment of ₹12,000 received from customer #5678', 
                time: '6h ago',
                staff: {
                  name: 'Priya Sharma',
                  avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
                }
              },
            ].map((notification, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.notificationItem}
                onPress={handleNotificationsPress}
                disabled={isNavigating}
              >
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
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Staff Performance */}
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
              <TouchableOpacity
                key={staff.id}
                style={styles.staffCard}
                onPress={() => handleStaffPress(staff.id)}
                disabled={isNavigating}
              >
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
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Business Overview */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Business Overview</Text>

          <TouchableOpacity 
            style={styles.salesOverview}
            onPress={handleSalesOverviewPress}
            disabled={isNavigating}
          >
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

            <TouchableOpacity 
              style={styles.periodSection}
              onPress={toggleLastWeekExpansion}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>

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
          </TouchableOpacity>
        </View>

      </ScrollView>

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
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Add bottom padding for FAB
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
    fontSize: 18,
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  kpiCardDisabled: {
    opacity: 0.6,
  },
  salesCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  returnsCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  stockCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  receivablesCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  payablesCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  kpiAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  salesAmount: {
    color: Colors.success,
  },
  receivablesAmount: {
    color: Colors.success,
  },
  returnsAmount: {
    color: Colors.error,
  },
  payablesAmount: {
    color: Colors.error,
  },
  stockAmount: {
    color: Colors.error,
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  kpiChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  kpiPeriod: {
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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