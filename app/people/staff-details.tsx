import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  IndianRupee,
  Building2
} from 'lucide-react-native';

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

// Mock staff data - in real app, this would come from API or context
const mockStaffData: Staff[] = [];

export default function StaffDetailsScreen() {
  const { staffId } = useLocalSearchParams();
  
  // Find the staff member by ID
  const staff = mockStaffData.find(s => s.id === staffId);
  
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
    router.push({
      pathname: '/people/add-staff',
      params: { staffId: staff.id }
    });
  };

  const salesAchievement = getTargetAchievement(staff.targets.achievedSales, staff.targets.monthlySalesTarget);
  const StatusIcon = getStatusIcon(staff.status);
  const statusColor = getStatusColor(staff.status);
  const performanceColor = getPerformanceColor(staff.performance.score);

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Staff Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: staff.avatar }}
              style={styles.staffAvatar}
              resizeMode="cover"
            />
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
                <Text style={styles.contactValue}>{staff.mobile}</Text>
              </View>
            </View>
            
            <View style={styles.contactRow}>
              <Mail size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{staff.email}</Text>
              </View>
            </View>
            
            <View style={styles.contactRow}>
              <MapPin size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>{staff.address}</Text>
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
                <Text style={styles.detailValue}>{staff.employeeId}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Salary Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Information</Text>
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
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
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
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyRow}>
              <Users size={20} color={Colors.primary} />
              <View style={styles.emergencyInfo}>
                <Text style={styles.emergencyLabel}>Name</Text>
                <Text style={styles.emergencyValue}>{staff.emergencyContact.name}</Text>
              </View>
            </View>
            
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Relation</Text>
              <Text style={styles.emergencyValue}>{staff.emergencyContact.relation}</Text>
            </View>
            
            <View style={styles.emergencyRow}>
              <Phone size={20} color={Colors.primary} />
              <View style={styles.emergencyInfo}>
                <Text style={styles.emergencyLabel}>Phone</Text>
                <Text style={styles.emergencyValue}>{staff.emergencyContact.phone}</Text>
              </View>
            </View>
          </View>
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
                  {formatDateTime(staff.attendance.lastCheckIn)}
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
  bottomSpacing: {
    height: 40,
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

