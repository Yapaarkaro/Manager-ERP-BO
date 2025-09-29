import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { ArrowLeft, Search, Filter, Users, Plus, Phone, Mail, MapPin, Calendar, Clock, TrendingUp, TrendingDown, IndianRupee, Award, Target, Eye, CreditCard as Edit, UserCheck, UserX } from 'lucide-react-native';

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

interface Staff {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  email: string;
  mobile: string;
  address: string;
  joinDate: string;
  employeeId: string;
  status: 'active' | 'inactive' | 'on_leave';
  attendance: {
    percentage: number;
    presentDays: number;
    totalDays: number;
    lastCheckIn: string;
  };
  performance: {
    score: number;
    salesAmount: number;
    invoicesProcessed: number;
    customersServed: number;
    returnsHandled: number;
    rating: number;
  };
  targets: {
    monthlySalesTarget: number;
    achievedSales: number;
    monthlyInvoiceTarget: number;
    achievedInvoices: number;
  };
  permissions: string[];
  salary: {
    basic: number;
    allowances: number;
    total: number;
  };
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
}

const mockStaffData: Staff[] = [
  {
    id: 'STAFF-001',
    name: 'Rajesh Kumar',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    role: 'Sales Manager',
    department: 'Sales',
    email: 'rajesh.kumar@company.com',
    mobile: '+91 98765 43210',
    address: '123, MG Road, Bangalore, Karnataka - 560001',
    joinDate: '2023-03-15',
    employeeId: 'EMP001',
    status: 'active',
    attendance: {
      percentage: 95,
      presentDays: 28,
      totalDays: 30,
      lastCheckIn: '2024-01-16T09:15:00Z'
    },
    performance: {
      score: 92,
      salesAmount: 450000,
      invoicesProcessed: 28,
      customersServed: 45,
      returnsHandled: 3,
      rating: 4.8
    },
    targets: {
      monthlySalesTarget: 500000,
      achievedSales: 450000,
      monthlyInvoiceTarget: 30,
      achievedInvoices: 28
    },
    permissions: ['sales', 'customer_management', 'inventory_view'],
    salary: {
      basic: 45000,
      allowances: 8000,
      total: 53000
    },
    emergencyContact: {
      name: 'Sunita Kumar',
      relation: 'Spouse',
      phone: '+91 98765 43211'
    }
  },
  {
    id: 'STAFF-002',
    name: 'Priya Sharma',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    role: 'Sales Executive',
    department: 'Sales',
    email: 'priya.sharma@company.com',
    mobile: '+91 87654 32109',
    address: '456, Electronic City, Bangalore, Karnataka - 560100',
    joinDate: '2023-06-20',
    employeeId: 'EMP002',
    status: 'active',
    attendance: {
      percentage: 88,
      presentDays: 26,
      totalDays: 30,
      lastCheckIn: '2024-01-16T09:30:00Z'
    },
    performance: {
      score: 85,
      salesAmount: 380000,
      invoicesProcessed: 22,
      customersServed: 38,
      returnsHandled: 5,
      rating: 4.5
    },
    targets: {
      monthlySalesTarget: 400000,
      achievedSales: 380000,
      monthlyInvoiceTarget: 25,
      achievedInvoices: 22
    },
    permissions: ['sales', 'customer_management'],
    salary: {
      basic: 35000,
      allowances: 6000,
      total: 41000
    },
    emergencyContact: {
      name: 'Ramesh Sharma',
      relation: 'Father',
      phone: '+91 87654 32110'
    }
  },
  {
    id: 'STAFF-003',
    name: 'Amit Singh',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    role: 'Store Manager',
    department: 'Operations',
    email: 'amit.singh@company.com',
    mobile: '+91 76543 21098',
    address: '789, Koramangala, Bangalore, Karnataka - 560095',
    joinDate: '2022-11-10',
    employeeId: 'EMP003',
    status: 'active',
    attendance: {
      percentage: 92,
      presentDays: 27,
      totalDays: 30,
      lastCheckIn: '2024-01-16T08:45:00Z'
    },
    performance: {
      score: 89,
      salesAmount: 520000,
      invoicesProcessed: 31,
      customersServed: 52,
      returnsHandled: 2,
      rating: 4.7
    },
    targets: {
      monthlySalesTarget: 550000,
      achievedSales: 520000,
      monthlyInvoiceTarget: 35,
      achievedInvoices: 31
    },
    permissions: ['sales', 'inventory_management', 'staff_management', 'reports'],
    salary: {
      basic: 50000,
      allowances: 10000,
      total: 60000
    },
    emergencyContact: {
      name: 'Kavita Singh',
      relation: 'Spouse',
      phone: '+91 76543 21099'
    }
  },
  {
    id: 'STAFF-004',
    name: 'Meera Joshi',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    role: 'Inventory Supervisor',
    department: 'Operations',
    email: 'meera.joshi@company.com',
    mobile: '+91 99887 76655',
    address: '321, Jayanagar, Bangalore, Karnataka - 560011',
    joinDate: '2023-01-08',
    employeeId: 'EMP004',
    status: 'on_leave',
    attendance: {
      percentage: 85,
      presentDays: 25,
      totalDays: 30,
      lastCheckIn: '2024-01-14T10:00:00Z'
    },
    performance: {
      score: 88,
      salesAmount: 0,
      invoicesProcessed: 0,
      customersServed: 0,
      returnsHandled: 8,
      rating: 4.6
    },
    targets: {
      monthlySalesTarget: 0,
      achievedSales: 0,
      monthlyInvoiceTarget: 0,
      achievedInvoices: 0
    },
    permissions: ['inventory_management', 'stock_audit'],
    salary: {
      basic: 40000,
      allowances: 7000,
      total: 47000
    },
    emergencyContact: {
      name: 'Suresh Joshi',
      relation: 'Father',
      phone: '+91 99887 76656'
    }
  },
  {
    id: 'STAFF-005',
    name: 'Vikram Patel',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    role: 'Cashier',
    department: 'Sales',
    email: 'vikram.patel@company.com',
    mobile: '+91 88776 65544',
    address: '567, Whitefield, Bangalore, Karnataka - 560066',
    joinDate: '2023-08-12',
    employeeId: 'EMP005',
    status: 'active',
    attendance: {
      percentage: 90,
      presentDays: 27,
      totalDays: 30,
      lastCheckIn: '2024-01-16T09:00:00Z'
    },
    performance: {
      score: 82,
      salesAmount: 280000,
      invoicesProcessed: 45,
      customersServed: 78,
      returnsHandled: 6,
      rating: 4.3
    },
    targets: {
      monthlySalesTarget: 300000,
      achievedSales: 280000,
      monthlyInvoiceTarget: 50,
      achievedInvoices: 45
    },
    permissions: ['sales', 'payment_processing'],
    salary: {
      basic: 28000,
      allowances: 5000,
      total: 33000
    },
    emergencyContact: {
      name: 'Ravi Patel',
      relation: 'Brother',
      phone: '+91 88776 65545'
    }
  },
];

export default function StaffScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStaff, setFilteredStaff] = useState(mockStaffData);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    department: [] as string[],
    role: [] as string[],
    performanceRange: 'none' as string,
    attendanceRange: 'none' as string,
    dateRange: 'none' as string,
  });

  const debouncedNavigate = useDebounceNavigation(500);


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, activeFilters);
  };

  const applyFilters = (query: string, filters: typeof activeFilters) => {
    let filtered = mockStaffData;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(staff =>
        staff.name.toLowerCase().includes(query.toLowerCase()) ||
        staff.role.toLowerCase().includes(query.toLowerCase()) ||
        staff.department.toLowerCase().includes(query.toLowerCase()) ||
        staff.employeeId.toLowerCase().includes(query.toLowerCase()) ||
        staff.email.toLowerCase().includes(query.toLowerCase()) ||
        staff.mobile.includes(query)
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(staff => 
        filters.status.includes(staff.status)
      );
    }

    // Apply department filter
    if (filters.department.length > 0) {
      filtered = filtered.filter(staff => 
        filters.department.includes(staff.department)
      );
    }

    // Apply role filter
    if (filters.role.length > 0) {
      filtered = filtered.filter(staff => 
        filters.role.includes(staff.role)
      );
    }

    // Apply performance range filter
    if (filters.performanceRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (filters.performanceRange === 'lowToHigh') {
          return a.performance.score - b.performance.score;
        } else {
          return b.performance.score - a.performance.score;
        }
      });
    }

    // Apply attendance range filter
    if (filters.attendanceRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (filters.attendanceRange === 'lowToHigh') {
          return a.attendance.percentage - b.attendance.percentage;
        } else {
          return b.attendance.percentage - a.attendance.percentage;
        }
      });
    }

    // Apply date range filter
    if (filters.dateRange !== 'none') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (filters.dateRange) {
        case 'recent':
          const recentDate = new Date(todayStart.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
          filtered = filtered.filter(staff => {
            const joinDate = new Date(staff.joinDate);
            return joinDate >= recentDate;
          });
          break;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          filtered = filtered.filter(staff => {
            const joinDate = new Date(staff.joinDate);
            return joinDate >= monthStart;
          });
          break;
        case 'quarter':
          const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
          filtered = filtered.filter(staff => {
            const joinDate = new Date(staff.joinDate);
            return joinDate >= quarterStart;
          });
          break;
      }
    }

    setFilteredStaff(filtered);
  };

  const handleStaffPress = (staff: Staff) => {
    debouncedNavigate({
      pathname: '/people/staff-details',
      params: { staffId: staff.id }
    });
  };

  const handleAddStaff = () => {
    debouncedNavigate('/people/add-staff');
  };

  const handleEditStaff = (staffId: string) => {
    debouncedNavigate({
      pathname: '/people/add-staff',
      params: { staffId }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'inactive': return Colors.error;
      case 'on_leave': return Colors.warning;
      default: return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'on_leave': return 'On Leave';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return UserCheck;
      case 'inactive': return UserX;
      case 'on_leave': return Clock;
      default: return Users;
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

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 80) return Colors.info;
    if (score >= 70) return Colors.warning;
    return Colors.error;
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'performanceRange' || filterType === 'attendanceRange' || filterType === 'dateRange') {
        (newFilters[filterType] as string) = value;
      } else {
        const currentValues = newFilters[filterType] as string[];
        if (currentValues.includes(value)) {
          (newFilters[filterType] as string[]) = currentValues.filter(v => v !== value);
        } else {
          (newFilters[filterType] as string[]) = [...currentValues, value];
        }
      }
      
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      status: [],
      department: [],
      role: [],
      performanceRange: 'none',
      attendanceRange: 'none',
      dateRange: 'none',
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.department.length > 0) count++;
    if (activeFilters.role.length > 0) count++;
    if (activeFilters.performanceRange !== 'none') count++;
    if (activeFilters.attendanceRange !== 'none') count++;
    if (activeFilters.dateRange !== 'none') count++;
    return count;
  };

  // Apply filters whenever activeFilters change
  useEffect(() => {
    applyFilters(searchQuery, activeFilters);
  }, [activeFilters]);

  const getTargetAchievement = (achieved: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((achieved / target) * 100);
  };

  const renderStaffCard = (staff: Staff) => {
    const StatusIcon = getStatusIcon(staff.status);
    const statusColor = getStatusColor(staff.status);
    const performanceColor = getPerformanceColor(staff.performance.score);
    const salesAchievement = getTargetAchievement(staff.targets.achievedSales, staff.targets.monthlySalesTarget);

    return (
      <TouchableOpacity
        key={staff.id}
        style={[
          styles.staffCard,
          { borderLeftColor: statusColor }
        ]}
        onPress={() => handleStaffPress(staff)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.staffHeader}>
          <View style={styles.staffLeft}>
            <Image 
              source={{ uri: staff.avatar }}
              style={styles.staffAvatar}
            />
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staff.name}</Text>
              <Text style={styles.staffRole}>{staff.role}</Text>
              <Text style={styles.staffDepartment}>{staff.department}</Text>
              <Text style={styles.employeeId}>ID: {staff.employeeId}</Text>
            </View>
          </View>

          <View style={styles.staffRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <StatusIcon size={14} color={statusColor} />
              <Text style={[
                styles.statusText,
                { color: statusColor }
              ]}>
                {getStatusText(staff.status)}
              </Text>
            </View>
            
            <View style={[
              styles.performanceBadge,
              { backgroundColor: `${performanceColor}20` }
            ]}>
              <Award size={14} color={performanceColor} />
              <Text style={[
                styles.performanceScore,
                { color: performanceColor }
              ]}>
                {staff.performance.score}/100
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Stats */}
        <View style={styles.performanceSection}>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>Attendance</Text>
              <Text style={[
                styles.performanceValue,
                { color: staff.attendance.percentage >= 90 ? Colors.success : 
                         staff.attendance.percentage >= 80 ? Colors.warning : Colors.error }
              ]}>
                {staff.attendance.percentage}%
              </Text>
            </View>

            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>
                {staff.performance.salesAmount > 0 ? 'Sales' : 'Tasks'}
              </Text>
              <Text style={[
                styles.performanceValue, 
                { color: staff.performance.salesAmount > 0 ? Colors.success : Colors.primary }
              ]}>
                {staff.performance.salesAmount > 0 
                  ? formatAmount(staff.performance.salesAmount)
                  : `${staff.performance.returnsHandled || staff.performance.invoicesProcessed || 0}`
                }
              </Text>
            </View>

            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>
                {staff.performance.salesAmount > 0 ? 'Invoices' : 'Customers'}
              </Text>
              <Text style={styles.performanceValue}>
                {staff.performance.salesAmount > 0 
                  ? staff.performance.invoicesProcessed 
                  : staff.performance.customersServed
                }
              </Text>
            </View>

            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>Rating</Text>
              <Text style={[styles.performanceValue, { color: Colors.warning }]}>
                ⭐ {staff.performance.rating}
              </Text>
            </View>
          </View>
        </View>

        {/* Target Achievement */}
        {staff.targets.monthlySalesTarget > 0 && (
          <View style={styles.targetSection}>
            <View style={styles.targetHeader}>
              <Target size={16} color={Colors.primary} />
              <Text style={styles.targetLabel}>Monthly Target Achievement</Text>
            </View>
            <View style={styles.targetProgress}>
              <View style={styles.targetProgressBar}>
                <View style={[
                  styles.targetProgressFill,
                  { 
                    width: `${Math.min(salesAchievement, 100)}%`,
                    backgroundColor: salesAchievement >= 100 ? Colors.success : 
                                   salesAchievement >= 80 ? Colors.warning : Colors.error
                  }
                ]} />
              </View>
              <Text style={styles.targetPercentage}>
                {salesAchievement}%
              </Text>
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <Phone size={14} color={Colors.textLight} />
            <Text style={styles.contactText}>{staff.mobile}</Text>
          </View>
          <View style={styles.contactRow}>
            <Mail size={14} color={Colors.textLight} />
            <Text style={styles.contactText} numberOfLines={1}>
              {staff.email}
            </Text>
          </View>
        </View>

        {/* Last Check-in */}
        <View style={styles.checkInSection}>
          <Clock size={14} color={Colors.textLight} />
          <Text style={styles.checkInText}>
            Last check-in: {formatDateTime(staff.attendance.lastCheckIn)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const activeStaff = filteredStaff.filter(s => s.status === 'active').length;
  const onLeaveStaff = filteredStaff.filter(s => s.status === 'on_leave').length;
  const avgPerformance = Math.round(filteredStaff.reduce((sum, s) => sum + s.performance.score, 0) / filteredStaff.length);

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
        
        <Text style={styles.headerTitle}>Staff</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredStaff.length} staff
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <UserCheck size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Active Staff</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {activeStaff}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Clock size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>On Leave</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {onLeaveStaff}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Award size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Avg Performance</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {avgPerformance}%
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Search Bar - Inline between summary and content */}
      <View style={styles.inlineSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Staff List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredStaff.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Staff Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No staff match your search criteria' : 'No staff members added yet'}
            </Text>
          </View>
        ) : (
          filteredStaff.map(renderStaffCard)
        )}
      </ScrollView>

      {/* Add Staff FAB */}
      <TouchableOpacity
        style={styles.addStaffFAB}
        onPress={handleAddStaff}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addStaffText}>Add Staff</Text>
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Staff</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {['active', 'inactive', 'on_leave'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        activeFilters.status.includes(status) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('status', status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.status.includes(status) && styles.filterOptionTextActive
                      ]}>
                        {status === 'on_leave' ? 'On Leave' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Department Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Department</Text>
                <View style={styles.filterOptions}>
                  {['Sales', 'Marketing', 'Finance', 'HR', 'IT', 'Operations', 'Customer Service'].map(dept => (
                    <TouchableOpacity
                      key={dept}
                      style={[
                        styles.filterOption,
                        activeFilters.department.includes(dept) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('department', dept)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.department.includes(dept) && styles.filterOptionTextActive
                      ]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Role Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Role</Text>
                <View style={styles.filterOptions}>
                  {['Manager', 'Executive', 'Assistant', 'Specialist', 'Coordinator', 'Analyst', 'Director'].map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.filterOption,
                        activeFilters.role.includes(role) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('role', role)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.role.includes(role) && styles.filterOptionTextActive
                      ]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Performance Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Performance Score</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'none', label: 'No Sort' },
                    { value: 'lowToHigh', label: 'Low to High' },
                    { value: 'highToLow', label: 'High to Low' }
                  ].map(range => (
                    <TouchableOpacity
                      key={range.value}
                      style={[
                        styles.filterOption,
                        activeFilters.performanceRange === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('performanceRange', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.performanceRange === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Attendance Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Attendance Rate</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'none', label: 'No Sort' },
                    { value: 'lowToHigh', label: 'Low to High' },
                    { value: 'highToLow', label: 'High to Low' }
                  ].map(range => (
                    <TouchableOpacity
                      key={range.value}
                      style={[
                        styles.filterOption,
                        activeFilters.attendanceRange === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('attendanceRange', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.attendanceRange === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Join Date</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'none', label: 'All Time' },
                    { value: 'recent', label: 'Recent (30 days)' },
                    { value: 'month', label: 'This Month' },
                    { value: 'quarter', label: 'This Quarter' }
                  ].map(range => (
                    <TouchableOpacity
                      key={range.value}
                      style={[
                        styles.filterOption,
                        activeFilters.dateRange === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('dateRange', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.dateRange === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
  staffCard: {
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
  staffHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  staffLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  staffAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  staffDepartment: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  staffRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  performanceScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceStat: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  targetSection: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  targetProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.grey[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  targetPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    minWidth: 32,
    textAlign: 'right',
  },
  contactSection: {
    gap: 8,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  checkInSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  checkInText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  addStaffFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40, // Above safe area to prevent gesture conflicts
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
  addStaffText: {
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
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    // No shadows or elevation - completely transparent
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for inline search and filter modal
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 16,
  },
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  // Filter Badge Styles
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  filterModalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterModalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});