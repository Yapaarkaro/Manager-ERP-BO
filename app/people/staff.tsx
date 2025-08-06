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
import { ArrowLeft, Search, Filter, Users, Plus, Phone, Mail, MapPin, Calendar, Clock, TrendingUp, TrendingDown, IndianRupee, Award, Target, Eye, CreditCard as Edit, UserCheck, UserX, X } from 'lucide-react-native';

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
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredStaff(mockStaffData);
    } else {
      const filtered = mockStaffData.filter(staff =>
        staff.name.toLowerCase().includes(query.toLowerCase()) ||
        staff.role.toLowerCase().includes(query.toLowerCase()) ||
        staff.department.toLowerCase().includes(query.toLowerCase()) ||
        staff.employeeId.toLowerCase().includes(query.toLowerCase()) ||
        staff.email.toLowerCase().includes(query.toLowerCase()) ||
        staff.mobile.includes(query)
      );
      setFilteredStaff(filtered);
    }
  };

  const handleStaffPress = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowDetailsModal(true);
  };

  const handleAddStaff = () => {
    router.push('/people/add-staff');
  };

  const handleEditStaff = (staffId: string) => {
    router.push({
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

            {staff.performance.salesAmount > 0 && (
              <View style={styles.performanceStat}>
                <Text style={styles.performanceLabel}>Sales</Text>
                <Text style={[styles.performanceValue, { color: Colors.success }]}>
                  {formatAmount(staff.performance.salesAmount)}
                </Text>
              </View>
            )}

            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>
                {staff.performance.salesAmount > 0 ? 'Invoices' : 'Tasks'}
              </Text>
              <Text style={styles.performanceValue}>
                {staff.performance.invoicesProcessed || staff.performance.returnsHandled}
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
        
        <Text style={styles.headerTitle}>Staff Performance</Text>
        
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

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Filter staff')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Staff Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedStaff && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Staff Details</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowDetailsModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Staff Profile */}
                  <View style={styles.modalProfileSection}>
                    <Image 
                      source={{ uri: selectedStaff.avatar }}
                      style={styles.modalStaffAvatar}
                    />
                    <Text style={styles.modalStaffName}>{selectedStaff.name}</Text>
                    <Text style={styles.modalStaffRole}>{selectedStaff.role}</Text>
                    <View style={[
                      styles.modalStatusBadge,
                      { backgroundColor: `${getStatusColor(selectedStaff.status)}20` }
                    ]}>
                      <Text style={[
                        styles.modalStatusText,
                        { color: getStatusColor(selectedStaff.status) }
                      ]}>
                        {getStatusText(selectedStaff.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Information */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Contact Information</Text>
                    <View style={styles.modalDetailRow}>
                      <Phone size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Mobile:</Text>
                      <Text style={styles.modalDetailValue}>{selectedStaff.mobile}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Mail size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Email:</Text>
                      <Text style={styles.modalDetailValue}>{selectedStaff.email}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <MapPin size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Address:</Text>
                      <Text style={[styles.modalDetailValue, styles.addressText]}>
                        {selectedStaff.address}
                      </Text>
                    </View>
                  </View>

                  {/* Employment Details */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Employment Details</Text>
                    <View style={styles.modalDetailRow}>
                      <Calendar size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Join Date:</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(selectedStaff.joinDate)}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Users size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Department:</Text>
                      <Text style={styles.modalDetailValue}>{selectedStaff.department}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <IndianRupee size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Salary:</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatAmount(selectedStaff.salary.total)}
                      </Text>
                    </View>
                  </View>

                  {/* Performance Metrics */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Performance Metrics</Text>
                    <View style={styles.modalPerformanceGrid}>
                      <View style={styles.modalPerformanceCard}>
                        <Text style={styles.modalPerformanceLabel}>Overall Score</Text>
                        <Text style={[
                          styles.modalPerformanceValue,
                          { color: getPerformanceColor(selectedStaff.performance.score) }
                        ]}>
                          {selectedStaff.performance.score}/100
                        </Text>
                      </View>
                      
                      <View style={styles.modalPerformanceCard}>
                        <Text style={styles.modalPerformanceLabel}>Attendance</Text>
                        <Text style={[
                          styles.modalPerformanceValue,
                          { color: selectedStaff.attendance.percentage >= 90 ? Colors.success : Colors.warning }
                        ]}>
                          {selectedStaff.attendance.percentage}%
                        </Text>
                      </View>

                      {selectedStaff.performance.salesAmount > 0 && (
                        <View style={styles.modalPerformanceCard}>
                          <Text style={styles.modalPerformanceLabel}>Sales</Text>
                          <Text style={[styles.modalPerformanceValue, { color: Colors.success }]}>
                            {formatAmount(selectedStaff.performance.salesAmount)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.modalPerformanceCard}>
                        <Text style={styles.modalPerformanceLabel}>Rating</Text>
                        <Text style={[styles.modalPerformanceValue, { color: Colors.warning }]}>
                          ⭐ {selectedStaff.performance.rating}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Emergency Contact */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Emergency Contact</Text>
                    <View style={styles.modalDetailRow}>
                      <Users size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Name:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedStaff.emergencyContact.name}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Relation:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedStaff.emergencyContact.relation}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Phone size={16} color={Colors.textLight} />
                      <Text style={styles.modalDetailLabel}>Phone:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedStaff.emergencyContact.phone}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setShowDetailsModal(false);
                        handleEditStaff(selectedStaff.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Edit size={16} color={Colors.primary} />
                      <Text style={styles.editButtonText}>Edit Staff</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
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
    maxHeight: '90%',
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
    flex: 1,
    padding: 20,
  },
  modalProfileSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalStaffAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  modalStaffName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalStaffRole: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    minWidth: 80,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  addressText: {
    lineHeight: 20,
  },
  modalPerformanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalPerformanceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  modalPerformanceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalPerformanceValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalActions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
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
});