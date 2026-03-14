import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Platform,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  Target, 
  Edit, 
  UserCheck, 
  UserX, 
  Users,
  User,
  IndianRupee,
  Building2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Star,
  FileText,
  RotateCcw,
  Copy,
  Share2,
  KeyRound,
} from 'lucide-react-native';
import { getStaff as getStaffFromBackend, invalidateApiCache, getStaffSessions, getStaffMetrics } from '@/services/backendApi';
import { DetailSkeleton } from '@/components/SkeletonLoader';
import { safeRouter } from '@/utils/safeRouter';
import { formatCurrencyINR } from '@/utils/formatters';

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
  is_online?: boolean;
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
  verificationCode?: string | null;
  hasLoggedIn?: boolean;
}

// Map backend staff to display Staff format
function mapBackendStaffToDisplayStaff(s: any): Staff {
  if (!s) throw new Error('Staff data is null or undefined');
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
    employeeId: s.employee_id || s.employeeId || s.emp_id || '',
    status: s.status || 'active',
    attendance: s.attendance || {
      percentage: 0,
      presentDays: 0,
      totalDays: 0,
      lastCheckIn: ''
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
    } : { basic: 0, allowances: 0, total: 0 },
    emergencyContact: (s.emergency_contact_name || s.emergencyContactName) ? {
      name: s.emergency_contact_name || s.emergencyContactName,
      relation: s.emergency_contact_relation || s.emergencyContactRelation || '',
      phone: s.emergency_contact_phone || s.emergencyContactPhone || ''
    } : { name: '', relation: '', phone: '' },
    is_online: s.is_online ?? false,
    verificationCode: s.verification_code ?? null,
    hasLoggedIn: !!s.user_id,
  };
}

export default function StaffDetailsScreen() {
  const { staffId } = useLocalSearchParams();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [showAttendance, setShowAttendance] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rawStaff, setRawStaff] = useState<any>(null);

  const loadStaff = useCallback(async () => {
    if (!hasLoadedOnce.current) setIsLoading(true);
    try {
      const result = await getStaffFromBackend();
      if (result.success && result.staff && Array.isArray(result.staff)) {
        const found = result.staff.find((s: any) => String(s?.id || s?.staff_id || s?.staffId) === String(staffId));
        if (found) {
          try {
            const mapped = mapBackendStaffToDisplayStaff(found);
            // Supplement verification_code and user_id via direct query
            try {
              const { supabase } = await import('@/lib/supabase');
              const { data: codeRow } = await supabase
                .from('staff')
                .select('verification_code, user_id')
                .eq('id', mapped.id)
                .maybeSingle();
              if (codeRow) {
                mapped.verificationCode = codeRow.verification_code;
                mapped.hasLoggedIn = !!codeRow.user_id;
              }
            } catch {}
            setStaff(mapped);
            setRawStaff(found);
          } catch (e) {
            console.error('Error mapping staff:', e);
            setStaff(null);
          }
        } else {
          setStaff(null);
        }
      } else {
        setStaff(null);
      }
    } catch (error) {
      console.error('Error loading staff details:', error);
      setStaff(null);
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
    }
  }, [staffId]);

  const loadAttendance = useCallback(async () => {
    if (!staffId) return;
    try {
      const startOfMonth = new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const endDate = endOfMonth < today ? endOfMonth : today;
      const result = await getStaffSessions({ staffId: String(staffId), startDate: startOfMonth, endDate });
      if (result.success && result.sessions) setAttendanceSessions(result.sessions);
    } catch {}
  }, [staffId, attendanceMonth]);

  useFocusEffect(
    useCallback(() => {
      if (staffId) {
        invalidateApiCache('staff');
        loadStaff();
        loadAttendance();
      } else {
        setIsLoading(false);
      }
    }, [staffId, loadStaff, loadAttendance])
  );

  useEffect(() => {
    if (!staffId) return;
    getStaffMetrics(String(staffId)).then(r => {
      if (r.success) setMetrics(r.metrics);
    });
  }, [staffId]);

  useEffect(() => {
    loadAttendance();
    setSelectedDate(null);
  }, [attendanceMonth, loadAttendance]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    Promise.all([loadStaff(), loadAttendance()]).catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [loadStaff, loadAttendance]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <DetailSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if staff not found
  if (!staff) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Staff member not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatAmount = (amount: number) => formatCurrencyINR(amount, 2, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return 'No check-ins yet';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'No check-ins yet';
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

  const getTargetAchievement = (achieved: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((achieved / target) * 100);
  };

  const handleEditStaff = () => {
    safeRouter.push({
      pathname: '/people/add-staff',
      params: { staffId: staff.id }
    });
  };

  const salesAchievement = getTargetAchievement(staff.targets.achievedSales, staff.targets.monthlySalesTarget);
  const StatusIcon = getStatusIcon(staff.status);
  const statusColor = getStatusColor(staff.status);
  const performanceColor = getPerformanceColor(staff.performance.score);

  const missingFields: string[] = [];
  if (!staff.address || staff.address.trim() === '') missingFields.push('Address');
  if (staff.salary.total <= 0) missingFields.push('Salary');
  if (!staff.emergencyContact.name || staff.emergencyContact.name.trim() === '') missingFields.push('Emergency Contact');
  if (staff.permissions.length === 0) missingFields.push('Permissions');
  const isIncomplete = missingFields.length > 0;

  const hasSalaryData = staff.salary.total > 0;
  const hasEmergencyContact = !!staff.emergencyContact.name && staff.emergencyContact.name.trim() !== '';
  const hasPermissions = staff.permissions.length > 0;

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
        
        <Text style={styles.headerTitle}>Staff Details</Text>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditStaff}
          activeOpacity={0.8}
        >
          <Edit size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Staff Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {staff.avatar ? (
              <Image source={{ uri: staff.avatar }} style={styles.staffAvatar} resizeMode="cover" />
            ) : (
              <View style={[styles.staffAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <User size={22} color="#6B7280" />
              </View>
            )}
          </View>

          <Text style={styles.staffName}>{staff.name}</Text>
          <Text style={styles.staffRole}>{staff.role}</Text>
          <Text style={styles.staffDepartment}>{staff.department}</Text>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <StatusIcon size={16} color={statusColor} />
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
              <Award size={16} color={performanceColor} />
              <Text style={[
                styles.performanceScore,
                { color: performanceColor }
              ]}>
                {staff.performance.score}/100
              </Text>
            </View>
          </View>
        </View>

        {/* Incomplete Profile Banner */}
        {isIncomplete && (
          <TouchableOpacity
            style={styles.incompleteBanner}
            onPress={handleEditStaff}
            activeOpacity={0.7}
          >
            <View style={styles.incompleteBannerIcon}>
              <AlertCircle size={22} color={Colors.warning} />
            </View>
            <View style={styles.incompleteBannerContent}>
              <Text style={styles.incompleteBannerTitle}>Incomplete Profile</Text>
              <Text style={styles.incompleteBannerText}>
                Missing: {missingFields.join(', ')}
              </Text>
            </View>
            <View style={styles.incompleteBannerAction}>
              <Text style={styles.incompleteBannerActionText}>Complete</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* First Login Verification Code — generate if missing, hide once staff has logged in */}
        {!staff.hasLoggedIn && !staff.verificationCode && (
          <View style={{
            marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff',
            borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E5E7EB',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
          }}>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10 }}>
              <View style={{
                width: 38, height: 38, borderRadius: 12, backgroundColor: '#DC2626',
                alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12,
              }}>
                <KeyRound size={20} color="#fff" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700' as const, color: '#1F2937' }}>No Login Code</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 }}>
              {staff.name.split(' ')[0]} doesn't have a first-login verification code yet. Generate one so they can log in using the Staff Login option in the app.
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                backgroundColor: '#3f66ac', borderRadius: 12, paddingVertical: 14,
              }}
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  const code = Math.floor(100000 + Math.random() * 900000).toString();
                  const { supabase } = await import('@/lib/supabase');
                  const { error } = await supabase
                    .from('staff')
                    .update({ verification_code: code })
                    .eq('id', staff.id);
                  if (error) {
                    Alert.alert('Error', 'Failed to generate code: ' + error.message);
                  } else {
                    setStaff({ ...staff, verificationCode: code });
                    Alert.alert('Code Generated', `Verification code ${code} has been generated for ${staff.name.split(' ')[0]}.`);
                  }
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to generate code');
                }
              }}
            >
              <KeyRound size={18} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '700' as const, color: '#fff', marginLeft: 8 }}>Generate Login Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {!staff.hasLoggedIn && staff.verificationCode && (() => {
          const digits = staff.verificationCode!.split('');
          const firstName = staff.name.split(' ')[0];
          return (
            <View style={{
              marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff',
              borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E5E7EB',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10 }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: '#d97706',
                  alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12,
                }}>
                  <KeyRound size={20} color="#fff" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700' as const, color: '#1F2937' }}>First Login Code</Text>
              </View>

              <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 20 }}>
                Share this 6-digit code with {firstName} so they can complete their first login.
              </Text>

              {/* Digit boxes */}
              <View style={{ flexDirection: 'row' as const, justifyContent: 'center' as const, marginBottom: 20 }}>
                {digits.map((digit, idx) => (
                  <View key={idx} style={{
                    width: 46, height: 56, borderRadius: 12, backgroundColor: '#FEF3C7',
                    borderWidth: 2, borderColor: '#F59E0B', alignItems: 'center' as const,
                    justifyContent: 'center' as const, marginHorizontal: 4,
                  }}>
                    <Text style={{ fontSize: 26, fontWeight: '800' as const, color: '#92400E' }}>{digit}</Text>
                  </View>
                ))}
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row' as const, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const,
                    justifyContent: 'center' as const, backgroundColor: '#3f66ac',
                    borderRadius: 12, paddingVertical: 14, marginRight: 10,
                  }}
                  activeOpacity={0.7}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(staff.verificationCode!);
                      Alert.alert('Copied', 'Code copied to clipboard');
                    } catch {
                      Alert.alert('Code', staff.verificationCode!);
                    }
                  }}
                >
                  <Copy size={18} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '700' as const, color: '#fff', marginLeft: 8 }}>Copy Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    width: 50, height: 50, borderRadius: 12, backgroundColor: '#F3F4F6',
                    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                  }}
                  activeOpacity={0.7}
                  onPress={async () => {
                    const msg = `Hi ${staff.name}, your Manager ERP first-login code is: ${staff.verificationCode}\n\nOpen the Manager app, tap "Staff Login", enter your mobile number (${staff.mobile}), verify the OTP, then enter this code to complete setup.`;
                    try { await Share.share({ message: msg }); } catch {}
                  }}
                >
                  <Share2 size={18} color="#3f66ac" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' as const, lineHeight: 17 }}>
                This code will disappear once {firstName} logs in successfully.
              </Text>
            </View>
          );
        })()}

        {/* Activity Summary - KPI Cards */}
        {metrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Summary</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={16} color={Colors.primary} />
                </View>
                <Text style={styles.kpiLabel}>Sales Created</Text>
                <Text style={styles.kpiValue}>{metrics?.invoiceCount || 0}</Text>
                <Text style={styles.kpiSubtext}>
                  {formatCurrencyINR(metrics?.invoiceAmount || 0)}
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <RotateCcw size={16} color={Colors.error} />
                </View>
                <Text style={styles.kpiLabel}>Returns Handled</Text>
                <Text style={styles.kpiValue}>{metrics?.returnCount || 0}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Users size={16} color={Colors.success} />
                </View>
                <Text style={styles.kpiLabel}>Customers Served</Text>
                <Text style={styles.kpiValue}>{metrics?.customerCount || 0}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <Star size={16} color={Colors.warning} />
                </View>
                <Text style={styles.kpiLabel}>Rating</Text>
                <Text style={styles.kpiValue}>{metrics?.avgRating?.toFixed(1) || '-'}</Text>
                <Text style={styles.kpiSubtext}>out of 5</Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Attendance</Text>
              <Text style={[
                styles.performanceValue,
                { color: staff.attendance.percentage >= 90 ? Colors.success : 
                         staff.attendance.percentage >= 80 ? Colors.warning : Colors.error }
              ]}>
                {staff.attendance.percentage}%
              </Text>
              <Text style={styles.performanceSubtext}>
                {staff.attendance.presentDays}/{staff.attendance.totalDays} days
              </Text>
            </View>

            <View style={styles.performanceCard}>
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
              <Text style={styles.performanceSubtext}>
                {staff.performance.salesAmount > 0 ? 'This month' : 'Completed'}
              </Text>
            </View>

            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>
                {staff.performance.salesAmount > 0 ? 'Invoices' : 'Customers'}
              </Text>
              <Text style={styles.performanceValue}>
                {staff.performance.salesAmount > 0 
                  ? staff.performance.invoicesProcessed 
                  : staff.performance.customersServed
                }
              </Text>
              <Text style={styles.performanceSubtext}>
                {staff.performance.salesAmount > 0 ? 'Processed' : 'Served'}
              </Text>
            </View>

            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Rating</Text>
              <Text style={[styles.performanceValue, { color: Colors.warning }]}>
                ⭐ {staff.performance.rating}
              </Text>
              <Text style={styles.performanceSubtext}>Overall</Text>
            </View>
          </View>
        </View>

        {/* Target Achievement */}
        {staff.targets.monthlySalesTarget > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Target Achievement</Text>
            <View style={styles.targetCard}>
              <View style={styles.targetHeader}>
                <Target size={20} color={Colors.primary} />
                <Text style={styles.targetLabel}>Sales Target</Text>
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
              <View style={styles.targetDetails}>
                <Text style={styles.targetDetailText}>
                  Achieved: {formatAmount(staff.targets.achievedSales)}
                </Text>
                <Text style={styles.targetDetailText}>
                  Target: {formatAmount(staff.targets.monthlySalesTarget)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <Phone size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Mobile</Text>
                <Text style={styles.contactValue}>{staff.mobile || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.contactRow}>
              <Mail size={20} color={staff.email ? Colors.primary : Colors.grey[300]} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={[styles.contactValue, !staff.email && styles.notProvided]}>
                  {staff.email || 'Not provided'}
                </Text>
              </View>
            </View>
            
            <View style={styles.contactRow}>
              <MapPin size={20} color={staff.address ? Colors.primary : Colors.grey[300]} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={[styles.contactValue, !staff.address && styles.notProvided]}>
                  {staff.address || 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Employment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Calendar size={20} color={Colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Join Date</Text>
                <Text style={styles.detailValue}>{formatDate(staff.joinDate)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Building2 size={20} color={Colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>{staff.department}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Users size={20} color={Colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Employee ID</Text>
                <Text style={styles.detailValue}>{staff.employeeId || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Salary Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Information</Text>
          {hasSalaryData ? (
            <View style={styles.salaryCard}>
              <View style={styles.salaryRow}>
                <Text style={styles.salaryLabel}>Basic Salary</Text>
                <Text style={styles.salaryValue}>{formatAmount(staff.salary.basic)}</Text>
              </View>
              <View style={styles.salaryRow}>
                <Text style={styles.salaryLabel}>Allowances</Text>
                <Text style={styles.salaryValue}>{formatAmount(staff.salary.allowances)}</Text>
              </View>
              <View style={[styles.salaryRow, styles.totalSalaryRow]}>
                <Text style={styles.totalSalaryLabel}>Total Salary</Text>
                <Text style={styles.totalSalaryValue}>{formatAmount(staff.salary.total)}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyCard} onPress={handleEditStaff} activeOpacity={0.7}>
              <IndianRupee size={20} color={Colors.grey[300]} />
              <Text style={styles.emptyCardText}>No salary information added</Text>
              <Text style={styles.emptyCardAction}>Tap to add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          {hasPermissions ? (
            <View style={styles.permissionsCard}>
              <View style={styles.permissionsContainer}>
                {staff.permissions.map((permission, index) => (
                  <View key={index} style={styles.permissionBadge}>
                    <Text style={styles.permissionText}>
                      {permission.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyCard} onPress={handleEditStaff} activeOpacity={0.7}>
              <Users size={20} color={Colors.grey[300]} />
              <Text style={styles.emptyCardText}>No permissions assigned</Text>
              <Text style={styles.emptyCardAction}>Tap to assign</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => setShowAttendance(!showAttendance)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Attendance</Text>
            <ChevronRight
              size={18}
              color={Colors.textLight}
              style={{ transform: [{ rotate: showAttendance ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => {
                const prev = new Date(attendanceMonth);
                prev.setMonth(prev.getMonth() - 1);
                setAttendanceMonth(prev);
              }}
              style={styles.monthArrow}
              activeOpacity={0.7}
            >
              <ChevronLeft size={18} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {attendanceMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = new Date(attendanceMonth);
                next.setMonth(next.getMonth() + 1);
                if (next <= new Date()) setAttendanceMonth(next);
              }}
              style={[
                styles.monthArrow,
                attendanceMonth.getMonth() === new Date().getMonth() &&
                  attendanceMonth.getFullYear() === new Date().getFullYear() && { opacity: 0.3 },
              ]}
              activeOpacity={0.7}
              disabled={
                attendanceMonth.getMonth() === new Date().getMonth() &&
                attendanceMonth.getFullYear() === new Date().getFullYear()
              }
            >
              <ChevronRight size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {(() => {
            const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const year = attendanceMonth.getFullYear();
            const month = attendanceMonth.getMonth();
            const firstDayOffset = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const workingDays: string[] = rawStaff?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            const joinDateRaw = staff.joinDate || rawStaff?.join_date || rawStaff?.created_at;
            const joinDateStr = joinDateRaw ? joinDateRaw.split('T')[0] : '';

            const sessionsByDate: Record<string, any[]> = {};
            attendanceSessions.forEach((s: any) => {
              const d = s.date;
              if (!sessionsByDate[d]) sessionsByDate[d] = [];
              sessionsByDate[d].push(s);
            });

            const totalHrs = attendanceSessions.reduce((acc: number, s: any) => {
              const start = new Date(s.check_in).getTime();
              const end = s.check_out ? new Date(s.check_out).getTime() : Date.now();
              return acc + (end - start) / 3_600_000;
            }, 0);
            const monthDays = new Set(attendanceSessions.map((s: any) => s.date)).size;
            const avgHrs = monthDays > 0 ? (totalHrs / monthDays) : 0;
            const autoOfflineCount = attendanceSessions.filter((s: any) => s.check_out_reason === 'geofence_exit').length;

            let presentCount = 0;
            let absentCount = 0;
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              if (dateStr > todayStr) break;
              if (joinDateStr && dateStr < joinDateStr) continue;
              const dayOfWeek = new Date(year, month, d).getDay();
              const dayAbbrev = DAY_ABBREVS[dayOfWeek];
              if (!workingDays.includes(dayAbbrev)) continue;
              if (sessionsByDate[dateStr] && sessionsByDate[dateStr].length > 0) {
                presentCount++;
              } else {
                absentCount++;
              }
            }
            const attendancePct = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

            const weeks: (number | null)[][] = [];
            let currentWeek: (number | null)[] = new Array(firstDayOffset).fill(null);
            for (let d = 1; d <= daysInMonth; d++) {
              currentWeek.push(d);
              if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
              }
            }
            if (currentWeek.length > 0) {
              while (currentWeek.length < 7) currentWeek.push(null);
              weeks.push(currentWeek);
            }

            function getDayCellInfo(day: number) {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayOfWeek = new Date(year, month, day).getDay();
              const dayAbbrev = DAY_ABBREVS[dayOfWeek];
              const isWorkingDay = workingDays.includes(dayAbbrev);
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              const isBeforeJoin = joinDateStr ? dateStr < joinDateStr : false;
              const hasSessions = !!sessionsByDate[dateStr] && sessionsByDate[dateStr].length > 0;

              let bgColor = Colors.grey[100];
              let textColor = Colors.textLight;
              if (isBeforeJoin || isFuture) {
                bgColor = Colors.grey[100];
                textColor = Colors.textLight;
              } else if (hasSessions) {
                bgColor = 'rgba(5, 150, 105, 0.15)';
                textColor = Colors.success;
              } else if (isWorkingDay && !hasSessions) {
                bgColor = 'rgba(220, 38, 38, 0.15)';
                textColor = Colors.error;
              }
              return { dateStr, isToday, bgColor, textColor };
            }

            const workStart = rawStaff?.work_start_time ? rawStaff.work_start_time.slice(0, 5) : '09:00';
            const workEnd = rawStaff?.work_end_time ? rawStaff.work_end_time.slice(0, 5) : '18:00';
            const workDaysLabel = workingDays.length === 7 ? 'All days' : workingDays.join(', ');

            return (
              <>
                {/* Working Hours Info */}
                <View style={calStyles.workingHoursRow}>
                  <Clock size={14} color={Colors.textLight} />
                  <Text style={calStyles.workingHoursText}>
                    {workStart} – {workEnd}, {workDaysLabel}
                  </Text>
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: Colors.textLight }}>This Month</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.text }}>{attendancePct}%</Text>
                    <Text style={{ fontSize: 11, color: Colors.textLight }}>{presentCount} present</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: Colors.textLight }}>Avg Hours</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.text }}>{avgHrs.toFixed(1)}</Text>
                    <Text style={{ fontSize: 11, color: Colors.textLight }}>per day</Text>
                  </View>
                  {autoOfflineCount > 0 && (
                    <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10 }}>
                      <Text style={{ fontSize: 11, color: Colors.textLight }}>Auto-Offline</Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.error }}>{autoOfflineCount}</Text>
                      <Text style={{ fontSize: 11, color: Colors.textLight }}>events</Text>
                    </View>
                  )}
                </View>

                {/* Online status indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 2 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: staff?.is_online ? Colors.success : Colors.error }} />
                  <Text style={{ fontSize: 13, color: Colors.textLight }}>
                    Currently {staff?.is_online ? 'Online' : 'Offline'}
                  </Text>
                </View>

                {showAttendance && (
                  <View style={{ marginTop: 16 }}>
                    {/* Calendar Grid */}
                    <View style={calStyles.calendarContainer}>
                      <View style={calStyles.calendarHeaderRow}>
                        {DAY_ABBREVS.map(d => (
                          <Text key={d} style={calStyles.calendarHeaderCell}>{d.charAt(0)}</Text>
                        ))}
                      </View>
                      {weeks.map((week, wi) => (
                        <View key={wi} style={calStyles.calendarWeekRow}>
                          {week.map((day, di) => {
                            if (day === null) {
                              return <View key={di} style={calStyles.calendarCell} />;
                            }
                            const info = getDayCellInfo(day);
                            const isSelected = selectedDate === info.dateStr;
                            return (
                              <TouchableOpacity
                                key={di}
                                style={[
                                  calStyles.calendarCell,
                                  { backgroundColor: info.bgColor },
                                  isSelected && calStyles.calendarCellSelected,
                                ]}
                                activeOpacity={0.6}
                                onPress={() => setSelectedDate(isSelected ? null : info.dateStr)}
                              >
                                <Text style={[calStyles.calendarDayText, { color: info.textColor }]}>{day}</Text>
                                {info.isToday && <View style={calStyles.todayDot} />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>

                    {/* Summary row */}
                    <View style={calStyles.summaryRow}>
                      <View style={calStyles.summaryItem}>
                        <View style={[calStyles.summaryDot, { backgroundColor: Colors.success }]} />
                        <Text style={calStyles.summaryText}>{presentCount} Present</Text>
                      </View>
                      <View style={calStyles.summaryItem}>
                        <View style={[calStyles.summaryDot, { backgroundColor: Colors.error }]} />
                        <Text style={calStyles.summaryText}>{absentCount} Absent</Text>
                      </View>
                      <View style={calStyles.summaryItem}>
                        <Text style={[calStyles.summaryText, { fontWeight: '700' }]}>{attendancePct}%</Text>
                      </View>
                    </View>

                    {/* Selected day drill-down */}
                    {selectedDate && (() => {
                      const selDay = parseInt(selectedDate.split('-')[2], 10);
                      const dayOfWeek = new Date(year, month, selDay).getDay();
                      const dayAbbrev = DAY_ABBREVS[dayOfWeek];
                      const isWorkingDay = workingDays.includes(dayAbbrev);
                      const daySessions = sessionsByDate[selectedDate] || [];
                      const dayLabel = new Date(year, month, selDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

                      return (
                        <View style={calStyles.drillDown}>
                          <Text style={calStyles.drillDownTitle}>{dayLabel}</Text>
                          {daySessions.length > 0 ? (
                            daySessions.map((session: any, idx: number) => {
                              const checkIn = new Date(session.check_in);
                              const checkOut = session.check_out ? new Date(session.check_out) : null;
                              const duration = checkOut ? ((checkOut.getTime() - checkIn.getTime()) / 3_600_000) : null;
                              const isGeoExit = session.check_out_reason === 'geofence_exit';

                              return (
                                <View key={session.id || idx} style={calStyles.drillDownSession}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {session.selfie_url ? (
                                      <Image source={{ uri: session.selfie_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                    ) : (
                                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.grey[100], alignItems: 'center', justifyContent: 'center' }}>
                                        <Clock size={14} color={Colors.textLight} />
                                      </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text }}>
                                        {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                      </Text>
                                      {duration != null && (
                                        <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 2 }}>
                                          Duration: {duration.toFixed(1)} hours
                                        </Text>
                                      )}
                                    </View>
                                    {isGeoExit && (
                                      <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, color: Colors.error, fontWeight: '700' }}>Geofence exit</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            })
                          ) : (
                            <Text style={{ fontSize: 13, color: Colors.textLight, paddingVertical: 8 }}>
                              {joinDateStr && selectedDate < joinDateStr
                                ? 'No data — Staff not yet joined'
                                : isWorkingDay ? 'Absent — No sessions recorded' : 'Non-working day'}
                            </Text>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                )}
              </>
            );
          })()}
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          {hasEmergencyContact ? (
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyRow}>
                <Users size={20} color={Colors.primary} />
                <View style={styles.emergencyInfo}>
                  <Text style={styles.emergencyLabel}>Name</Text>
                  <Text style={styles.emergencyValue}>{staff.emergencyContact.name}</Text>
                </View>
              </View>
              
              {staff.emergencyContact.relation ? (
                <View style={styles.emergencyRow}>
                  <Award size={20} color={Colors.primary} />
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyLabel}>Relation</Text>
                    <Text style={styles.emergencyValue}>{staff.emergencyContact.relation}</Text>
                  </View>
                </View>
              ) : null}
              
              {staff.emergencyContact.phone ? (
                <View style={styles.emergencyRow}>
                  <Phone size={20} color={Colors.primary} />
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyLabel}>Phone</Text>
                    <Text style={styles.emergencyValue}>{staff.emergencyContact.phone}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyCard} onPress={handleEditStaff} activeOpacity={0.7}>
              <Phone size={20} color={Colors.grey[300]} />
              <Text style={styles.emptyCardText}>No emergency contact added</Text>
              <Text style={styles.emptyCardAction}>Tap to add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Last Check-in */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Clock size={20} color={Colors.primary} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityLabel}>Last Check-in</Text>
                <Text style={styles.activityValue}>
                  {formatDateTime(
                    attendanceSessions.length > 0
                      ? attendanceSessions.reduce((latest: string, s: any) => {
                          const ci = s.check_in || '';
                          return ci > latest ? ci : latest;
                        }, '')
                      : staff.attendance.lastCheckIn
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  staffName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  staffRole: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  staffDepartment: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  performanceScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  incompleteBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incompleteBannerContent: {
    flex: 1,
  },
  incompleteBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  incompleteBannerText: {
    fontSize: 13,
    color: '#A16207',
    fontWeight: '500',
  },
  incompleteBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  incompleteBannerActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  performanceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
  targetCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  targetLabel: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  targetProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  targetProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.grey[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  targetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetDetailText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  contactCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  notProvided: {
    color: Colors.grey[300],
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyCardText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  emptyCardAction: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  salaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  salaryValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  totalSalaryRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  totalSalaryLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  totalSalaryValue: {
    fontSize: 18,
    color: Colors.success,
    fontWeight: '700',
  },
  permissionsCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  emergencyCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    fontWeight: '500',
  },
  emergencyValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  activityCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    fontWeight: '500',
  },
  activityValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  kpiSubtext: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
});

const calStyles = StyleSheet.create({
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  workingHoursText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 8,
    overflow: 'hidden',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    paddingVertical: 6,
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 8,
  },
  calendarCellSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 12,
    paddingVertical: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  drillDown: {
    marginTop: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  drillDownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  drillDownSession: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
});

