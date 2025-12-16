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
import { ArrowLeft, Search, Filter, Users, Plus, Phone, Mail, MapPin, Calendar, Clock, TrendingUp, TrendingDown, IndianRupee, Award, Target, Eye, CreditCard as Edit, UserCheck, UserX, AlertCircle } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { getStaff as getStaffFromBackend } from '@/services/backendApi';

// Map backend staff to display Staff format
function mapBackendStaffToDisplayStaff(s: any): Staff {
  // Handle missing or invalid data
  if (!s) {
    throw new Error('Staff data is null or undefined');
  }
  
  // Ensure we have at least a name and id
  if (!s.name && !s.staff_name) {
    console.warn('⚠️ Staff member missing name:', s);
  }
  
  const staffId = s.id || s.staff_id || s.staffId || `staff_${Date.now()}`;
  const staffName = s.name || s.staff_name || 'Unknown';
  const staffMobile = s.mobile || s.mobile_number || s.phone || '';
  const staffRole = s.role || s.job_role || 'Staff';
  
  return {
    id: staffId,
    name: staffName,
    avatar: s.avatar || s.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=3f66ac&color=fff&size=150`,
    role: staffRole,
    department: s.department || s.department_name || 'Operations',
    email: s.email || s.email_address || '',
    mobile: staffMobile,
    address: s.address || s.full_address || '',
    joinDate: s.join_date || s.created_at || s.date_joined || new Date().toISOString(),
    employeeId: s.employee_id || s.employeeId || s.emp_id || `EMP${staffId.slice(-4)}`,
    status: s.status || 'active',
    attendance: s.attendance || {
      percentage: 0,
      presentDays: 0,
      totalDays: 0,
      lastCheckIn: new Date().toISOString()
    },
    performance: s.performance || {
      score: 0,
      salesAmount: 0,
      invoicesProcessed: 0,
      customersServed: 0,
      returnsHandled: 0,
      rating: 0
    },
    targets: s.targets || {
      monthlySalesTarget: s.monthly_sales_target || s.monthlySalesTarget || 0,
      achievedSales: 0,
      monthlyInvoiceTarget: s.monthly_invoice_target || s.monthlyInvoiceTarget || 0,
      achievedInvoices: 0
    },
    permissions: s.permissions || s.permission_list || [],
    salary: (s.basic_salary || s.basicSalary || s.allowances) ? {
      basic: s.basic_salary || s.basicSalary || 0,
      allowances: s.allowances || 0,
      total: (s.basic_salary || s.basicSalary || 0) + (s.allowances || 0)
    } : undefined,
    emergencyContact: (s.emergency_contact_name || s.emergencyContactName) ? {
      name: s.emergency_contact_name || s.emergencyContactName,
      relation: s.emergency_contact_relation || s.emergencyContactRelation || '',
      phone: s.emergency_contact_phone || s.emergencyContactPhone || ''
    } : undefined
  };
}

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

export default function StaffScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
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
  const { data: businessData } = useBusinessData();

  // ✅ Fetch staff from backend (backend is source of truth)
  useEffect(() => {
    const loadStaff = async () => {
      try {
        console.log('🔄 Fetching staff from backend...');
        // Fetch staff directly from backend
        let backendResult = await getStaffFromBackend();
        
        console.log('📦 Backend result:', {
          success: backendResult.success,
          staffCount: backendResult.staff?.length || 0,
          error: backendResult.error,
          staff: backendResult.staff
        });
        
        // If Edge Function fails, try direct Supabase query as fallback
        if (!backendResult.success && (backendResult.error?.includes('Failed to fetch') || backendResult.error?.includes('Network error'))) {
          console.log('🔄 Edge Function unavailable, trying direct Supabase query...');
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              // Get business_id from users table first, then fallback to businessData
              const { data: userData } = await supabase
                .from('users')
                .select('business_id')
                .eq('id', session.user.id)
                .single();
              
              const businessId = userData?.business_id || businessData?.business?.id;
              if (businessId) {
                const { data: staffData, error: dbError } = await supabase
                  .from('staff')
                  .select('*')
                  .eq('business_id', businessId)
                  .order('created_at', { ascending: false });
                
                if (!dbError && staffData && Array.isArray(staffData)) {
                  console.log('✅ Fetched staff directly from Supabase, count:', staffData.length);
                  backendResult = {
                    success: true,
                    staff: staffData,
                  };
                } else {
                  console.warn('⚠️ Direct Supabase query also failed:', dbError);
                }
              } else {
                console.warn('⚠️ No business_id found for fallback query');
              }
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback query failed:', fallbackError);
          }
        }
        
        if (backendResult.success && backendResult.staff && Array.isArray(backendResult.staff)) {
          // Get current user's phone number to filter out business owner
          let ownerMobile = '';
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.phone) {
              ownerMobile = user.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
              console.log('📱 Owner mobile for filtering:', ownerMobile);
            }
          } catch (error) {
            console.warn('Could not get user phone for filtering:', error);
          }
          
          // Convert backend staff to display format
          let formattedStaff: Staff[] = backendResult.staff.map((s: any) => {
            try {
              return mapBackendStaffToDisplayStaff(s);
            } catch (error) {
              console.error('Error mapping staff member:', s, error);
              return null;
            }
          }).filter((s: Staff | null): s is Staff => s !== null);
          
          console.log('✅ Formatted staff count before filtering:', formattedStaff.length);
          
          // ✅ Filter out business owner
          // Filter by: 1) Role contains "owner", 2) Mobile matches current user's phone
          const filteredStaff = formattedStaff.filter(staff => {
            const roleLower = (staff.role || '').toLowerCase();
            const isOwnerRole = roleLower.includes('owner') || roleLower.includes('business owner');
            
            // Also check if mobile matches current user (business owner)
            const staffMobile = (staff.mobile || '').replace(/\D/g, '').slice(0, 10);
            const isOwnerMobile = ownerMobile && staffMobile === ownerMobile;
            
            // Exclude if it's the owner
            const shouldExclude = isOwnerRole || isOwnerMobile;
            if (shouldExclude) {
              console.log('🚫 Filtered out owner:', staff.name, { isOwnerRole, isOwnerMobile, role: staff.role, mobile: staff.mobile });
            }
            return !shouldExclude;
          });
          
          // Safety check: If filtering removed all staff, show all staff (filtering might be too aggressive)
          const finalStaff = filteredStaff.length > 0 ? filteredStaff : formattedStaff;
          
          if (filteredStaff.length === 0 && formattedStaff.length > 0) {
            console.warn('⚠️ All staff were filtered out! Showing all staff instead. This might indicate the owner filter is too aggressive.');
          }
          
          console.log('✅ Final staff count after filtering:', finalStaff.length);
          console.log('📋 Staff list:', finalStaff.map(s => ({ name: s.name, role: s.role, mobile: s.mobile })));
          
          setAllStaff(finalStaff);
          setFilteredStaff(finalStaff);
        } else {
          // If backend fetch fails, show empty state
          console.warn('⚠️ Backend fetch failed or no staff data:', backendResult);
          setAllStaff([]);
          setFilteredStaff([]);
        }
      } catch (error) {
        console.error('❌ Error loading staff from backend:', error);
        setAllStaff([]);
        setFilteredStaff([]);
      }
    };
    
    loadStaff();
  }, [businessData]);


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, activeFilters);
  };

  const applyFilters = (query: string, filters: typeof activeFilters) => {
    // Use allStaff state as the source
    let filtered = [...allStaff];

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
    // Check if staff is incomplete (missing email, address, salary, or emergency contact)
    const isIncomplete = !staff.email || !staff.address || !staff.salary || !staff.emergencyContact;
    
    if (isIncomplete) {
      // Navigate to add-staff form with pre-filled data
      debouncedNavigate({
        pathname: '/people/add-staff',
        params: {
          staffId: staff.id,
          prefillName: staff.name,
          prefillMobile: staff.mobile,
          prefillRole: staff.role,
        }
      });
    } else {
      debouncedNavigate({
        pathname: '/people/staff-details',
        params: { staffId: staff.id }
      });
    }
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

  // Apply filters whenever activeFilters, searchQuery, or allStaff change
  useEffect(() => {
    applyFilters(searchQuery, activeFilters);
  }, [activeFilters, searchQuery, allStaff]);

  const getTargetAchievement = (achieved: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((achieved / target) * 100);
  };

  const renderStaffCard = (staff: Staff) => {
    const StatusIcon = getStatusIcon(staff.status);
    const statusColor = getStatusColor(staff.status);
    const performanceColor = getPerformanceColor(staff.performance.score);
    const salesAchievement = getTargetAchievement(staff.targets.achievedSales, staff.targets.monthlySalesTarget);
    // Check if staff is incomplete (missing email, address, salary, or emergency contact)
    const isIncomplete = !staff.email || !staff.address || !staff.salary || !staff.emergencyContact;

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
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: staff.avatar }}
                style={styles.staffAvatar}
              />
              {/* Notification icon for incomplete staff */}
              {isIncomplete && (
                <View style={styles.incompleteBadge}>
                  <AlertCircle size={12} color="#FFFFFF" fill="#FFC754" />
                </View>
              )}
            </View>
            <View style={styles.staffInfo}>
              <View style={styles.staffNameRow}>
                <Text style={styles.staffName}>{staff.name}</Text>
                {isIncomplete && (
                  <View style={styles.incompleteIndicator}>
                    <Text style={styles.incompleteText}>Complete Details</Text>
                  </View>
                )}
              </View>
              <Text style={styles.staffRole}>{staff.role}</Text>
              <Text style={styles.staffDepartment}>{staff.department}</Text>
              {staff.employeeId && (
                <Text style={styles.employeeId}>ID: {staff.employeeId}</Text>
              )}
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
            
            {staff.performance.score > 0 && (
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
            )}
          </View>
        </View>

        {/* Performance Stats - Only show if staff has performance data */}
        {!isIncomplete && staff.performance && staff.performance.score > 0 && (
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
        )}

        {/* Incomplete Info Message */}
        {isIncomplete && (
          <View style={styles.incompleteSection}>
            <AlertCircle size={16} color={Colors.warning} />
            <Text style={styles.incompleteMessage}>
              Complete staff details to enable performance tracking
            </Text>
          </View>
        )}

        {/* Target Achievement */}
        {!isIncomplete && staff.targets && staff.targets.monthlySalesTarget > 0 && (
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

        {/* Contact Info - Always show for all staff */}
        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <Phone size={14} color={Colors.textLight} />
            <Text style={styles.contactText}>{staff.mobile}</Text>
          </View>
          {staff.email && (
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.textLight} />
              <Text style={styles.contactText} numberOfLines={1}>
                {staff.email}
              </Text>
            </View>
          )}
        </View>
        
        {/* Last Check-in - Only show if staff has attendance data */}
        {!isIncomplete && staff.attendance && staff.attendance.lastCheckIn && (
          <View style={styles.checkInSection}>
            <Clock size={14} color={Colors.textLight} />
            <Text style={styles.checkInText}>
              Last check-in: {formatDateTime(staff.attendance.lastCheckIn)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeStaff = filteredStaff.filter(s => s.status === 'active').length;
  const onLeaveStaff = filteredStaff.filter(s => s.status === 'on_leave').length;
  const staffWithPerformance = filteredStaff.filter(s => s.performance && s.performance.score > 0);
  const avgPerformance = staffWithPerformance.length > 0
    ? Math.round(staffWithPerformance.reduce((sum, s) => sum + s.performance.score, 0) / staffWithPerformance.length)
    : 0;

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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  staffHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  staffLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 20,
  },
  staffAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  staffInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  staffName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  staffDepartment: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
  },
  employeeId: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  staffRight: {
    alignItems: 'flex-end',
    gap: 10,
    justifyContent: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  performanceScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  performanceStat: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  targetSection: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  targetLabel: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  targetProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    gap: 10,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  contactText: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
    fontWeight: '500',
  },
  checkInSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  checkInText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  avatarContainer: {
    position: 'relative',
  },
  incompleteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFC754',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    zIndex: 10,
  },
  incompleteIndicator: {
    backgroundColor: '#FFC754',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 8,
  },
  incompleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  incompleteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC754',
  },
  incompleteMessage: {
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '600',
    flex: 1,
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