import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  Calendar,
  IndianRupee,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Check,
  MessageSquare,
  Hash,
  ShoppingCart,
  Package,
  Wallet,
  BarChart3,
  UserCog,
  Crown,
  Clock,
  Locate,
  Radio,
} from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { createStaff, updateStaff, getStaff, invalidateApiCache } from '@/services/backendApi';
import { getInputFocusStyles } from '@/utils/platformUtils';
import GoogleAddressAutocomplete from '@/components/GoogleAddressAutocomplete';
import TimeInputWithPicker from '@/components/TimeInputWithPicker';
import { formatCurrencyINR } from '@/utils/formatters';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

const roles = [
  'Sales Manager',
  'Sales Executive',
  'Store Manager',
  'Cashier',
  'Inventory Supervisor',
  'Warehouse Manager',
  'Accountant',
  'Customer Service Representative',
  'Marketing Executive',
  'HR Executive',
  'Others'
];

const departments = [
  'Sales',
  'Operations',
  'Inventory',
  'Accounts',
  'Marketing',
  'HR',
  'Customer Service',
  'Others'
];

const permissions = [
  {
    id: 'sales',
    label: 'Sales Management',
    icon: ShoppingCart,
    color: '#059669',
    description: 'Staff will be able to create sales invoices only.',
  },
  {
    id: 'inventory',
    label: 'Inventory Management',
    icon: Package,
    color: '#0EA5E9',
    description: 'Staff will be able to create sales, purchase, and return invoices, manage stock-in entries, and create write-off entries.',
  },
  {
    id: 'customer_management',
    label: 'Customer Management',
    icon: Users,
    color: '#8B5CF6',
    description: 'Staff will be able to access all customer data and manage their profiles, addresses, and order history.',
  },
  {
    id: 'payment_processing',
    label: 'Payment Processing',
    icon: Wallet,
    color: '#D97706',
    description: 'Staff will be able to access all supplier and customer details, view payables and receivables, update bank and cash transactions, and add income and expenses.',
  },
  {
    id: 'reports',
    label: 'Reports Access',
    icon: BarChart3,
    color: '#EC4899',
    description: 'Staff will be able to access all classified business reports — P&L, balance sheet, cashbook, transactions, profit margins, receivables, payables, and business health details.',
  },
  {
    id: 'staff_management',
    label: 'Staff Management',
    icon: UserCog,
    color: '#6366F1',
    description: 'Staff will be able to access all staff details and update, edit, or delete them.',
  },
  {
    id: 'master_access',
    label: 'Master Access',
    icon: Crown,
    color: '#DC2626',
    description: 'This gives the staff full access to everything the business owner has — complete control over all business operations and settings.',
  },
];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface StaffFormData {
  name: string;
  mobile: string;
  email: string;
  role: string;
  customRole: string;
  department: string;
  customDepartment: string;
  address: string;
  employeeId: string;
  basicSalary: string;
  allowances: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  permissions: string[];
  monthlySalesTarget: string;
  monthlyInvoiceTarget: string;
  workStartTime: string;
  workEndTime: string;
  workingDays: string[];
  attendanceMode: 'geofence' | 'manual';
  geofenceRadius: string;
}

function generateEmployeeId() {
  const prefix = 'EMP';
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${number}`;
}

export default function AddStaffScreen() {
  const params = useLocalSearchParams();
  const editMode = params.staffId ? true : false;
  const prefillName = params.prefillName as string;
  const prefillMobile = params.prefillMobile as string;
  const prefillRole = params.prefillRole as string;
  const prefillLocationId = params.locationId as string;
  const prefillLocationType = params.locationType as 'branch' | 'warehouse' | 'primary';
  const prefillLocationName = params.locationName as string;

  // ✅ Use unified business data hook to get locations
  const { data: businessData } = useBusinessData();
  
  // Get all locations for location dropdown (only if user has multiple locations)
  const allLocations = businessData?.addresses || [];
  const hasMultipleLocations = allLocations.length > 1;
  const locationsForDropdown = allLocations.map((addr: any) => ({
    id: addr.id,
    name: addr.name,
    type: addr.type,
    displayName: `${addr.type === 'branch' ? 'Branch' : addr.type === 'warehouse' ? 'Warehouse' : 'Primary'}: ${addr.name}`
  }));

  const [formData, setFormData] = useState<StaffFormData>({
    name: prefillName || '',
    mobile: prefillMobile || '',
    email: '',
    role: prefillRole || '',
    customRole: '',
    department: '',
    customDepartment: '',
    address: '',
    employeeId: editMode ? '' : generateEmployeeId(),
    basicSalary: '',
    allowances: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    permissions: [],
    monthlySalesTarget: '',
    monthlyInvoiceTarget: '',
    workStartTime: '09:00',
    workEndTime: '18:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    attendanceMode: 'geofence',
    geofenceRadius: '100',
  });

  const [useCustomEmployeeId, setUseCustomEmployeeId] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<string>(prefillLocationId || '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [expandedPermission, setExpandedPermission] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(editMode);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [existingVerificationCode, setExistingVerificationCode] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const roleSearchRef = useRef<TextInput>(null);
  const departmentSearchRef = useRef<TextInput>(null);
  
  // Get input focus styles
  const inputFocusStyles = getInputFocusStyles();

  const updateFormData = (field: keyof StaffFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleSelect = (role: string) => {
    updateFormData('role', role);
    if (role !== 'Others') {
      updateFormData('customRole', '');
    }
    setRoleSearch('');
    setShowRoleModal(false);
  };

  const handleDepartmentSelect = (department: string) => {
    updateFormData('department', department);
    if (department !== 'Others') {
      updateFormData('customDepartment', '');
    }
    setDepartmentSearch('');
    setShowDepartmentModal(false);
  };

  const allPermissionIds = permissions.map(p => p.id);

  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = formData.permissions;
    const isCurrentlySelected = currentPermissions.includes(permissionId);

    if (permissionId === 'master_access') {
      if (isCurrentlySelected) {
        updateFormData('permissions', []);
      } else {
        updateFormData('permissions', [...allPermissionIds]);
      }
      return;
    }

    let next: string[];
    if (isCurrentlySelected) {
      next = currentPermissions.filter(p => p !== permissionId && p !== 'master_access');
    } else {
      next = [...currentPermissions, permissionId];
      const nonMasterIds = allPermissionIds.filter(id => id !== 'master_access');
      if (nonMasterIds.every(id => next.includes(id))) {
        next = [...allPermissionIds];
      }
    }
    updateFormData('permissions', next);
  };

  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    updateFormData('mobile', cleaned);
  };

  const handleEmergencyPhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    updateFormData('emergencyContactPhone', cleaned);
  };

  const handleSalaryChange = (field: 'basicSalary' | 'allowances', text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    updateFormData(field, cleaned);
  };

  const handleTargetChange = (field: 'monthlySalesTarget' | 'monthlyInvoiceTarget', text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    updateFormData(field, cleaned);
  };

  const handleWorkingDayToggle = (day: string) => {
    const current = formData.workingDays;
    if (current.includes(day)) {
      updateFormData('workingDays', current.filter(d => d !== day));
    } else {
      updateFormData('workingDays', [...current, day]);
    }
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.mobile.length === 10 &&
      formData.role.trim().length > 0 &&
      (formData.role !== 'Others' || formData.customRole.trim().length > 0) &&
      formData.department.trim().length > 0 &&
      (formData.department !== 'Others' || formData.customDepartment.trim().length > 0) &&
      formData.address.trim().length > 0 &&
      formData.basicSalary.trim().length > 0 &&
      formData.emergencyContactName.trim().length > 0 &&
      formData.emergencyContactPhone.length === 10 &&
      formData.permissions.length > 0
    );
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const getCleanStaffFields = () => ({
    name: formData.name.trim(),
    mobile: formData.mobile,
    email: formData.email.trim() || undefined,
    role: formData.role === 'Others' ? formData.customRole.trim() : formData.role,
    department: formData.department === 'Others' ? formData.customDepartment.trim() : formData.department,
    address: formData.address.trim() || undefined,
    employeeId: formData.employeeId.trim() || undefined,
    locationId: selectedLocation || undefined,
    locationType: selectedLocation ? locationsForDropdown.find(loc => loc.id === selectedLocation)?.type : undefined,
    locationName: selectedLocation ? locationsForDropdown.find(loc => loc.id === selectedLocation)?.name : undefined,
    basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : undefined,
    allowances: formData.allowances ? parseFloat(formData.allowances) : undefined,
    emergencyContactName: formData.emergencyContactName.trim() || undefined,
    emergencyContactRelation: formData.emergencyContactRelation.trim() || undefined,
    emergencyContactPhone: formData.emergencyContactPhone || undefined,
    permissions: formData.permissions,
    monthlySalesTarget: formData.monthlySalesTarget ? parseFloat(formData.monthlySalesTarget) : undefined,
    monthlyInvoiceTarget: formData.monthlyInvoiceTarget ? parseFloat(formData.monthlyInvoiceTarget) : undefined,
    workStartTime: formData.workStartTime || undefined,
    workEndTime: formData.workEndTime || undefined,
    workingDays: formData.workingDays,
    attendanceMode: formData.attendanceMode,
    geofenceRadius: formData.geofenceRadius ? parseInt(formData.geofenceRadius) : 100,
  });

  const getSnakeCaseFields = (employeeId?: string, verificationCode?: string) => ({
    name: formData.name.trim(),
    mobile: formData.mobile,
    email: formData.email.trim() || null,
    role: formData.role === 'Others' ? formData.customRole.trim() : formData.role,
    department: formData.department === 'Others' ? formData.customDepartment.trim() : formData.department,
    address: formData.address.trim() || null,
    ...(employeeId ? { employee_id: employeeId } : {}),
    ...(verificationCode ? { verification_code: verificationCode } : {}),
    location_id: selectedLocation || null,
    location_type: selectedLocation ? locationsForDropdown.find(loc => loc.id === selectedLocation)?.type : null,
    location_name: selectedLocation ? locationsForDropdown.find(loc => loc.id === selectedLocation)?.name : null,
    basic_salary: formData.basicSalary ? parseFloat(formData.basicSalary) : null,
    allowances: formData.allowances ? parseFloat(formData.allowances) : null,
    emergency_contact_name: formData.emergencyContactName.trim() || null,
    emergency_contact_relation: formData.emergencyContactRelation.trim() || null,
    emergency_contact_phone: formData.emergencyContactPhone || null,
    permissions: formData.permissions,
    monthly_sales_target: formData.monthlySalesTarget ? parseFloat(formData.monthlySalesTarget) : null,
    monthly_invoice_target: formData.monthlyInvoiceTarget ? parseFloat(formData.monthlyInvoiceTarget) : null,
    work_start_time: formData.workStartTime || null,
    work_end_time: formData.workEndTime || null,
    working_days: formData.workingDays,
    attendance_mode: formData.attendanceMode,
    geofence_radius: formData.geofenceRadius ? parseInt(formData.geofenceRadius) : 100,
  });

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const employeeId = formData.employeeId.trim() || (editMode ? undefined : generateEmployeeId());
    const otp = editMode ? undefined : generateOtp();

    try {
      let saveSuccess = false;

      if (editMode && params.staffId) {
        const updateResult = await updateStaff({
          staffId: params.staffId as string,
          ...getCleanStaffFields(),
        });

        if (updateResult.success) {
          saveSuccess = true;
        } else {
          // Fallback: direct Supabase update
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { error: updateError } = await supabase
                .from('staff')
                .update({
                  ...getSnakeCaseFields(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', params.staffId as string);

              if (!updateError) {
                saveSuccess = true;
                invalidateApiCache('staff');
              }
            }
          } catch (fallbackError) {
            console.error('Fallback update failed:', fallbackError);
          }

          if (!saveSuccess) {
            Alert.alert('Error', updateResult.error || 'Failed to update staff');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        const createResult = await createStaff({
          ...getCleanStaffFields(),
          employeeId: employeeId,
          verificationCode: otp,
        });

        if (createResult.success) {
          saveSuccess = true;
          // Edge function may not persist verification_code — patch it directly
          try {
            const { supabase } = await import('@/lib/supabase');
            const staffId = createResult.staff?.id || createResult.staff?.staff_id;
            if (staffId && otp) {
              await supabase
                .from('staff')
                .update({ verification_code: otp })
                .eq('id', staffId);
              console.log('✅ Patched verification_code for staff', staffId);
            } else if (otp) {
              // No staff ID returned — find by mobile + business
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('business_id')
                  .eq('id', session.user.id)
                  .single();
                const businessId = userData?.business_id || businessData?.business?.id;
                if (businessId) {
                  await supabase
                    .from('staff')
                    .update({ verification_code: otp })
                    .eq('business_id', businessId)
                    .eq('mobile', formData.mobile);
                  console.log('✅ Patched verification_code by mobile', formData.mobile);
                }
              }
            }
          } catch (patchErr) {
            console.warn('⚠️ Could not patch verification_code:', patchErr);
          }
        } else {
          // Fallback: direct Supabase insert
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: userData } = await supabase
                .from('users')
                .select('business_id')
                .eq('id', session.user.id)
                .single();

              const businessId = userData?.business_id || businessData?.business?.id;
              if (businessId) {
                const { error: insertError } = await supabase
                  .from('staff')
                  .insert({
                    business_id: businessId,
                    ...getSnakeCaseFields(employeeId, otp),
                    status: 'active',
                  });

                if (!insertError) {
                  saveSuccess = true;
                  invalidateApiCache('staff');
                }
              }
            }
          } catch (fallbackError) {
            console.error('Fallback insert failed:', fallbackError);
          }

          if (!saveSuccess) {
            Alert.alert('Error', createResult.error || 'Failed to create staff');
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!editMode && otp) {
        try {
          const { supabase: sb } = await import('@/lib/supabase');
          const { data: { session: sess } } = await sb.auth.getSession();
          if (sess?.user) {
            const { data: uData } = await sb.from('users').select('business_id').eq('id', sess.user.id).single();
            const bid = uData?.business_id || businessData?.business?.id;
            if (bid) {
              const { data: checkRow } = await sb
                .from('staff')
                .select('id, verification_code')
                .eq('business_id', bid)
                .eq('mobile', formData.mobile)
                .maybeSingle();
              if (checkRow && !checkRow.verification_code) {
                await sb.from('staff').update({ verification_code: otp }).eq('id', checkRow.id);
              }
            }
          }
        } catch {}
      }

      setIsSubmitting(false);

      if (editMode) {
        if (existingVerificationCode) {
          setGeneratedEmployeeId(formData.employeeId || '');
          setGeneratedOtp(existingVerificationCode);
          setShowOtpModal(true);
        } else {
          Alert.alert(
            'Staff Updated',
            `${formData.name}'s details have been updated successfully.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else {
        setGeneratedEmployeeId(employeeId!);
        setGeneratedOtp(otp!);
        setShowOtpModal(true);
      }
    } catch (error: any) {
      console.error('Error saving staff:', error);
      Alert.alert('Error', error.message || 'Failed to save staff');
      setIsSubmitting(false);
    }
  };

  const handleOtpConfirm = () => {
    setShowOtpModal(false);
    router.back();
  };

  const formatAmount = (amount: number | string | null | undefined) => {
    if (!amount) return '₹0';
    return formatCurrencyINR(amount);
  };

  const getTotalSalary = () => {
    const basic = parseInt(formData.basicSalary) || 0;
    const allowances = parseInt(formData.allowances) || 0;
    return basic + allowances;
  };

  const filteredRoles = roles.filter(role =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredDepartments = departments.filter(dept =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const filteredLocations = locationsForDropdown.filter(loc =>
    loc.displayName.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setLocationSearch('');
    setShowLocationModal(false);
  };

  const populateFormFromStaff = (s: any) => {
    const staffRole = s.role || s.job_role || '';
    const staffDept = s.department || s.department_name || '';

    const roleIsPreset = roles.filter(r => r !== 'Others').includes(staffRole);
    const deptIsPreset = departments.filter(d => d !== 'Others').includes(staffDept);

    const existingEmpId = s.employee_id || s.employeeId || s.emp_id || '';
    setFormData({
      name: s.name || s.staff_name || '',
      mobile: s.mobile || s.mobile_number || s.phone || '',
      email: s.email || s.email_address || '',
      role: roleIsPreset ? staffRole : (staffRole ? 'Others' : ''),
      customRole: roleIsPreset ? '' : staffRole,
      department: deptIsPreset ? staffDept : (staffDept ? 'Others' : ''),
      customDepartment: deptIsPreset ? '' : staffDept,
      address: s.address || s.full_address || '',
      employeeId: existingEmpId,
      basicSalary: s.basic_salary?.toString() || s.basicSalary?.toString() || '',
      allowances: s.allowances?.toString() || '',
      emergencyContactName: s.emergency_contact_name || s.emergencyContactName || '',
      emergencyContactRelation: s.emergency_contact_relation || s.emergencyContactRelation || '',
      emergencyContactPhone: s.emergency_contact_phone || s.emergencyContactPhone || '',
      permissions: (s.permissions || s.permission_list || []).map((p: string) => p === 'settings' ? 'master_access' : p),
      monthlySalesTarget: s.monthly_sales_target?.toString() || s.monthlySalesTarget?.toString() || '',
      monthlyInvoiceTarget: s.monthly_invoice_target?.toString() || s.monthlyInvoiceTarget?.toString() || '',
      workStartTime: (s.work_start_time || s.workStartTime || '09:00').substring(0, 5),
      workEndTime: (s.work_end_time || s.workEndTime || '18:00').substring(0, 5),
      workingDays: s.working_days || s.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      attendanceMode: s.attendance_mode || s.attendanceMode || 'geofence',
      geofenceRadius: (s.geofence_radius || s.geofenceRadius || 100).toString(),
    });

    if (existingEmpId) {
      setUseCustomEmployeeId(true);
    }

    const locId = s.location_id || s.locationId;
    if (locId) {
      setSelectedLocation(locId);
    }
  };

  useEffect(() => {
    if (editMode && params.staffId) {
      const loadStaffData = async () => {
        setIsLoadingEdit(true);
        let staffFound = false;

        try {
          const result = await getStaff();
          if (result.success && result.staff) {
            const existing = result.staff.find(
              (s: any) => s.id === params.staffId || s.staff_id === params.staffId || s.staffId === params.staffId
            );
            if (existing) {
              populateFormFromStaff(existing);
              staffFound = true;
            }
          }
        } catch (error) {
          console.error('Edge function staff fetch failed:', error);
        }

        if (!staffFound) {
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: staffRow, error: dbError } = await supabase
              .from('staff')
              .select('*')
              .eq('id', params.staffId as string)
              .single();

            if (!dbError && staffRow) {
              populateFormFromStaff(staffRow);
              if (staffRow.verification_code) {
                setExistingVerificationCode(staffRow.verification_code);
              }
              staffFound = true;
            }
          } catch (fallbackError) {
            console.error('Direct Supabase staff fetch also failed:', fallbackError);
          }
        }

        // Always try to get verification code from Supabase (edge function may not include it)
        if (staffFound && !existingVerificationCode) {
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: codeRow } = await supabase
              .from('staff')
              .select('verification_code')
              .eq('id', params.staffId as string)
              .maybeSingle();
            if (codeRow?.verification_code) {
              setExistingVerificationCode(codeRow.verification_code);
            }
          } catch {}
        }

        setIsLoadingEdit(false);
      };
      loadStaffData();
    }
  }, [editMode, params.staffId]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{editMode ? 'Update Staff' : 'Add New Staff'}</Text>
        </View>

        {isLoadingEdit ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading staff details...</Text>
          </View>
        ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'name' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'name' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'mobile' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'mobile' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.mobile}
                  onChangeText={handleMobileChange}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                  onFocus={() => setFocusedField('mobile')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'email' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <Mail size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text.toLowerCase())}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { zIndex: 1000 }]}>
              <Text style={styles.label}>Address *</Text>
              <GoogleAddressAutocomplete
                placeholder="Search for an address..."
                onAddressSelect={(addressData) => {
                  const parts = [
                    addressData.placeName || addressData.premise || '',
                    addressData.street || '',
                    addressData.area || '',
                    addressData.city || '',
                    addressData.state || '',
                    addressData.pincode || '',
                  ].filter(Boolean);
                  updateFormData('address', parts.join(', '));
                }}
                containerStyle={{ marginBottom: 8 }}
              />
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'address' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'address' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[Platform.OS === 'web' ? inputFocusStyles.input : styles.input, styles.addressInput]}
                  value={formData.address}
                  onChangeText={(text) => updateFormData('address', text)}
                  placeholder="Or type address manually"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Job Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Information</Text>
            
            {/* Location Selection - Only show if user has multiple locations */}
            {hasMultipleLocations && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowLocationModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !selectedLocation && styles.placeholderText
                  ]}>
                    {selectedLocation 
                      ? locationsForDropdown.find(loc => loc.id === selectedLocation)?.displayName || 'Select location'
                      : 'Select location (optional)'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role *</Text>
              {formData.role === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                      value={formData.customRole}
                      onChangeText={(text) => updateFormData('customRole', text)}
                      placeholder="Enter custom role"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                      onFocus={() => setFocusedField('customRole')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowRoleModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowRoleModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.role && styles.placeholderText
                  ]}>
                    {formData.role || 'Select role'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department *</Text>
              {formData.department === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      { flex: 1 },
                      focusedField === 'customDepartment' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any,
                    default: [
                      styles.inputContainer,
                      { flex: 1 },
                      focusedField === 'customDepartment' && styles.inputContainerFocused,
                    ].filter(Boolean) as any,
                  }) as any}>
                    <TextInput
                      style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                      value={formData.customDepartment}
                      onChangeText={(text) => updateFormData('customDepartment', text)}
                      placeholder="Enter custom department"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                      onFocus={() => setFocusedField('customDepartment')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowDepartmentModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowDepartmentModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.department && styles.placeholderText
                  ]}>
                    {formData.department || 'Select department'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Permissions *</Text>
              <Text style={styles.permSectionHint}>
                Select what this staff member can access. Tap a card to see details.
              </Text>
              <View style={styles.permCardsContainer}>
                {permissions.map((perm) => {
                  const isSelected = formData.permissions.includes(perm.id);
                  const isExpanded = expandedPermission === perm.id;
                  const hasMasterAccess = formData.permissions.includes('master_access');
                  const autoGranted = hasMasterAccess && perm.id !== 'master_access';
                  const PermIcon = perm.icon;
                  return (
                    <View
                      key={perm.id}
                      style={[
                        styles.permCard,
                        isSelected && { borderColor: perm.color, backgroundColor: `${perm.color}08` },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.permCardHeader}
                        onPress={() => setExpandedPermission(isExpanded ? null : perm.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.permIconWrap, { backgroundColor: `${perm.color}15` }]}>
                          <PermIcon size={18} color={perm.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.permCardTitle, isSelected && { color: perm.color }]} numberOfLines={1}>
                            {perm.label}
                          </Text>
                          {autoGranted && (
                            <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 2 }}>
                              Auto-granted via Master Access
                            </Text>
                          )}
                        </View>
                        {isExpanded
                          ? <ChevronUp size={16} color={Colors.textLight} />
                          : <ChevronDown size={16} color={Colors.textLight} />
                        }
                      </TouchableOpacity>

                      {isExpanded && (
                        <Text style={styles.permCardDesc}>{perm.description}</Text>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.permToggleBtn,
                          isSelected && { backgroundColor: perm.color },
                          autoGranted && { opacity: 0.7 },
                        ]}
                        onPress={() => handlePermissionToggle(perm.id)}
                        activeOpacity={0.7}
                        disabled={autoGranted}
                      >
                        {isSelected && <Check size={14} color="#fff" style={{ marginRight: 4 }} />}
                        <Text style={[
                          styles.permToggleText,
                          isSelected && { color: '#fff' },
                        ]}>
                          {autoGranted ? 'Included' : (isSelected ? 'Granted' : 'Grant Access')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {!editMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Employee ID</Text>
                <View style={styles.employeeIdToggle}>
                  <TouchableOpacity
                    style={[styles.toggleOption, !useCustomEmployeeId && styles.toggleOptionActive]}
                    onPress={() => {
                      setUseCustomEmployeeId(false);
                      updateFormData('employeeId', generateEmployeeId());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleOptionText, !useCustomEmployeeId && styles.toggleOptionTextActive]}>
                      Auto-generate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleOption, useCustomEmployeeId && styles.toggleOptionActive]}
                    onPress={() => { setUseCustomEmployeeId(true); updateFormData('employeeId', ''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleOptionText, useCustomEmployeeId && styles.toggleOptionTextActive]}>
                      Enter manually
                    </Text>
                  </TouchableOpacity>
                </View>
                {useCustomEmployeeId ? (
                  <View style={[styles.inputContainer, { marginTop: 8 }]}>
                    <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                      value={formData.employeeId}
                      onChangeText={(text) => updateFormData('employeeId', text.toUpperCase())}
                      placeholder="e.g. EMP001"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="characters"
                      onFocus={() => setFocusedField('employeeId')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                ) : (
                  <View style={styles.autoIdContainer}>
                    <View style={styles.autoIdDisplay}>
                      <Hash size={18} color={Colors.primary} />
                      <Text style={styles.autoIdValue}>{formData.employeeId || '—'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.regenerateBtn}
                      onPress={() => updateFormData('employeeId', generateEmployeeId())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.regenerateBtnText}>Regenerate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {editMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Employee ID</Text>
                <View style={[styles.inputContainer, { marginTop: 0 }]}>
                  <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                    value={formData.employeeId}
                    onChangeText={(text) => updateFormData('employeeId', text.toUpperCase())}
                    placeholder="Employee ID"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="characters"
                    onFocus={() => setFocusedField('employeeId')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Salary Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Salary Information</Text>
            
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Basic Salary *</Text>
                <View style={Platform.select({
                  web: [
                    inputFocusStyles.inputContainer,
                    focusedField === 'basicSalary' && inputFocusStyles.inputContainerFocused,
                  ].filter(Boolean) as any,
                  default: [
                    styles.inputContainer,
                    focusedField === 'basicSalary' && styles.inputContainerFocused,
                  ].filter(Boolean) as any,
                }) as any}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                    value={formData.basicSalary}
                    onChangeText={(text) => handleSalaryChange('basicSalary', text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    onFocus={() => setFocusedField('basicSalary')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Allowances</Text>
                <View style={Platform.select({
                  web: [
                    inputFocusStyles.inputContainer,
                    focusedField === 'allowances' && inputFocusStyles.inputContainerFocused,
                  ].filter(Boolean) as any,
                  default: [
                    styles.inputContainer,
                    focusedField === 'allowances' && styles.inputContainerFocused,
                  ].filter(Boolean) as any,
                }) as any}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                    value={formData.allowances}
                    onChangeText={(text) => handleSalaryChange('allowances', text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    onFocus={() => setFocusedField('allowances')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>

            {(formData.basicSalary || formData.allowances) && (
              <View style={styles.totalSalaryContainer}>
                <Text style={styles.totalSalaryLabel}>Total Monthly Salary:</Text>
                <Text style={styles.totalSalaryValue}>
                  {formatAmount(getTotalSalary().toString())}
                </Text>
              </View>
            )}
          </View>

          {/* Working Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working Hours</Text>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <TimeInputWithPicker
                  label="Start Time"
                  value={formData.workStartTime}
                  onChangeTime={(time) => updateFormData('workStartTime', time)}
                  placeholder="Select start time"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <TimeInputWithPicker
                  label="End Time"
                  value={formData.workEndTime}
                  onChangeTime={(time) => updateFormData('workEndTime', time)}
                  placeholder="Select end time"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Working Days</Text>
              <View style={styles.daysRow}>
                {ALL_DAYS.map((day) => {
                  const isActive = formData.workingDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayButton, isActive && styles.dayButtonActive]}
                      onPress={() => handleWorkingDayToggle(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Attendance Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Controls</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Attendance Mode</Text>
              <Text style={{ fontSize: 13, color: Colors.textLight, marginBottom: 10, lineHeight: 18 }}>
                Choose how this staff member marks attendance.
              </Text>
              <View style={styles.employeeIdToggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, formData.attendanceMode === 'geofence' && styles.toggleOptionActive]}
                  onPress={() => updateFormData('attendanceMode', 'geofence')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
                    <Locate size={14} color={formData.attendanceMode === 'geofence' ? '#fff' : Colors.textLight} />
                    <Text style={[styles.toggleOptionText, formData.attendanceMode === 'geofence' && styles.toggleOptionTextActive]}>
                      Geofence
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, formData.attendanceMode === 'manual' && styles.toggleOptionActive]}
                  onPress={() => updateFormData('attendanceMode', 'manual')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
                    <Radio size={14} color={formData.attendanceMode === 'manual' ? '#fff' : Colors.textLight} />
                    <Text style={[styles.toggleOptionText, formData.attendanceMode === 'manual' && styles.toggleOptionTextActive]}>
                      One-Time Check-in
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {formData.attendanceMode === 'geofence' && (
                <View style={{
                  backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 10,
                  borderWidth: 1, borderColor: '#BFDBFE',
                }}>
                  <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17 }}>
                    Staff must be within the geofence radius of their assigned location to stay checked in. They will be auto-checked-out if they leave the radius for more than 60 seconds.
                  </Text>
                </View>
              )}

              {formData.attendanceMode === 'manual' && (
                <View style={{
                  backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 10,
                  borderWidth: 1, borderColor: '#BBF7D0',
                }}>
                  <Text style={{ fontSize: 12, color: '#166534', lineHeight: 17 }}>
                    Staff marks attendance once per day with a single check-in. No continuous location tracking. They must manually check out when done.
                  </Text>
                </View>
              )}
            </View>

            {formData.attendanceMode === 'geofence' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Geofence Radius (meters)</Text>
                <Text style={{ fontSize: 13, color: Colors.textLight, marginBottom: 8, lineHeight: 18 }}>
                  How far from the work location the staff can be before being auto-checked-out.
                </Text>
                <View style={styles.rowContainer}>
                  {['50', '100', '200', '500'].map(radius => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.dayButton,
                        formData.geofenceRadius === radius && styles.dayButtonActive,
                        { flex: 1 },
                      ]}
                      onPress={() => updateFormData('geofenceRadius', radius)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        formData.geofenceRadius === radius && styles.dayButtonTextActive,
                      ]}>
                        {radius}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[
                  Platform.OS === 'web'
                    ? inputFocusStyles.inputContainer
                    : styles.inputContainer,
                  { marginTop: 10 },
                ] as any}>
                  <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                    value={formData.geofenceRadius}
                    onChangeText={(text) => updateFormData('geofenceRadius', text.replace(/[^0-9]/g, ''))}
                    placeholder="Custom radius in meters"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    maxLength={5}
                    onFocus={() => setFocusedField('geofenceRadius')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <Text style={{ fontSize: 14, color: Colors.textLight, fontWeight: '500' }}>m</Text>
                </View>
              </View>
            )}
          </View>

          {/* Targets (for sales roles) */}
          {(formData.role.toLowerCase().includes('sales') || formData.customRole.toLowerCase().includes('sales')) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Targets</Text>
              
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Sales Target</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'monthlySalesTarget' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any,
                    default: [
                      styles.inputContainer,
                      focusedField === 'monthlySalesTarget' && styles.inputContainerFocused,
                    ].filter(Boolean) as any,
                  }) as any}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                      value={formData.monthlySalesTarget}
                      onChangeText={(text) => handleTargetChange('monthlySalesTarget', text)}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      onFocus={() => setFocusedField('monthlySalesTarget')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Invoice Target</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'monthlyInvoiceTarget' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any,
                    default: [
                      styles.inputContainer,
                      focusedField === 'monthlyInvoiceTarget' && styles.inputContainerFocused,
                    ].filter(Boolean) as any,
                  }) as any}>
                    <TextInput
                      style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                      value={formData.monthlyInvoiceTarget}
                      onChangeText={(text) => handleTargetChange('monthlyInvoiceTarget', text)}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      onFocus={() => setFocusedField('monthlyInvoiceTarget')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Name *</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'emergencyContactName' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'emergencyContactName' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.emergencyContactName}
                  onChangeText={(text) => updateFormData('emergencyContactName', text)}
                  placeholder="Enter emergency contact name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('emergencyContactName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relation</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'emergencyContactRelation' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'emergencyContactRelation' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.emergencyContactRelation}
                  onChangeText={(text) => updateFormData('emergencyContactRelation', text)}
                  placeholder="e.g., Spouse, Father, Mother"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('emergencyContactRelation')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <View style={Platform.select({
                web: [
                  inputFocusStyles.inputContainer,
                  focusedField === 'emergencyContactPhone' && inputFocusStyles.inputContainerFocused,
                ].filter(Boolean) as any,
                default: [
                  styles.inputContainer,
                  focusedField === 'emergencyContactPhone' && styles.inputContainerFocused,
                ].filter(Boolean) as any,
              }) as any}>
                <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={Platform.OS === 'web' ? inputFocusStyles.input : styles.input}
                  value={formData.emergencyContactPhone}
                  onChangeText={handleEmergencyPhoneChange}
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                  onFocus={() => setFocusedField('emergencyContactPhone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText
            ]}>
              {isSubmitting
                ? (editMode ? 'Updating Staff...' : 'Adding Staff...')
                : (editMode ? 'Update Staff Member' : 'Add Staff Member')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        )}

        {/* Role Selection Modal */}
        <Modal
          visible={showRoleModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRoleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Role</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowRoleModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textLight} />
                <TextInput
                  ref={roleSearchRef}
                  style={styles.searchInput}
                  value={roleSearch}
                  onChangeText={setRoleSearch}
                  placeholder="Search roles..."
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {filteredRoles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.modalOption,
                      formData.role === role && styles.selectedOption
                    ]}
                    onPress={() => handleRoleSelect(role)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.role === role && styles.selectedOptionText
                    ]}>
                      {role}
                    </Text>
                    {formData.role === role && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Department Selection Modal */}
        <Modal
          visible={showDepartmentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDepartmentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Department</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDepartmentModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textLight} />
                <TextInput
                  ref={departmentSearchRef}
                  style={styles.searchInput}
                  value={departmentSearch}
                  onChangeText={setDepartmentSearch}
                  placeholder="Search departments..."
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {filteredDepartments.map((department) => (
                  <TouchableOpacity
                    key={department}
                    style={[
                      styles.modalOption,
                      formData.department === department && styles.selectedOption
                    ]}
                    onPress={() => handleDepartmentSelect(department)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.department === department && styles.selectedOptionText
                    ]}>
                      {department}
                    </Text>
                    {formData.department === department && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Permissions modal removed — inline cards used instead */}

        {/* Location Selection Modal */}
        {hasMultipleLocations && (
          <Modal
            visible={showLocationModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLocationModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Location</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowLocationModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Search size={18} color={Colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    value={locationSearch}
                    onChangeText={setLocationSearch}
                    placeholder="Search locations..."
                    placeholderTextColor={Colors.textLight}
                    onFocus={(e) => {
                      if (Platform.OS === 'web') {
                        e.target.style.outline = 'none';
                      }
                    }}
                  />
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      !selectedLocation && styles.selectedOption
                    ]}
                    onPress={() => handleLocationSelect('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      !selectedLocation && styles.selectedOptionText
                    ]}>
                      No Location (Optional)
                    </Text>
                    {!selectedLocation && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                  {filteredLocations.map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      style={[
                        styles.modalOption,
                        selectedLocation === location.id && styles.selectedOption
                      ]}
                      onPress={() => handleLocationSelect(location.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        selectedLocation === location.id && styles.selectedOptionText
                      ]}>
                        {location.displayName}
                      </Text>
                      {selectedLocation === location.id && (
                        <Check size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* OTP Confirmation Modal */}
        <Modal
          visible={showOtpModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.otpModalContainer}>
              <View style={styles.otpModalHeader}>
                <View style={styles.otpIconContainer}>
                  <MessageSquare size={32} color={Colors.success} />
                </View>
                <Text style={styles.otpModalTitle}>Staff Invitation Sent!</Text>
              </View>

              <View style={styles.otpModalContent}>
                <Text style={styles.otpModalMessage}>
                  An OTP has been sent to {formData.name} at {formData.mobile}
                </Text>

                <View style={styles.otpDetailsContainer}>
                  <View style={styles.otpDetailRow}>
                    <Text style={styles.otpDetailLabel}>Employee ID:</Text>
                    <Text style={styles.otpDetailValue}>{generatedEmployeeId}</Text>
                  </View>
                  <View style={styles.otpDetailRow}>
                    <Text style={styles.otpDetailLabel}>OTP Code:</Text>
                    <Text style={styles.otpDetailValue}>{generatedOtp}</Text>
                  </View>
                  <View style={styles.otpDetailRow}>
                    <Text style={styles.otpDetailLabel}>Mobile:</Text>
                    <Text style={styles.otpDetailValue}>+91 {formData.mobile}</Text>
                  </View>
                </View>

                <View style={styles.otpInstructions}>
                  <Text style={styles.otpInstructionsTitle}>Next Steps:</Text>
                  <Text style={styles.otpInstructionsText}>
                    1. Share the Employee ID and OTP with {formData.name}
                    {'\n'}2. They can log in using the Staff Login option in the Manager app
                    {'\n'}3. After verifying their mobile number, they enter this OTP to join your business
                    {'\n'}4. Once verified, they'll have access to their assigned permissions
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.otpConfirmButton}
                  onPress={handleOtpConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.otpConfirmButtonText}>
                    Got it, Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...Platform.select({
      default: {
        minHeight: 50,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: '#3f66ac',
  },
  inputIcon: {
    marginRight: 12,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Platform.select({
      web: 14,
      default: 14,
    }),
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none' as any,
      },
      default: {
        minHeight: 50,
      },
    }),
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  employeeIdToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: Colors.primary,
  },
  toggleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
  },
  autoIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  autoIdDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  autoIdValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  regenerateBtn: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  regenerateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  permSectionHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
    lineHeight: 18,
  },
  permCardsContainer: {
    gap: 10,
  },
  permCard: {
    borderWidth: 1.5,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.background,
  },
  permCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  permCardDesc: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
    marginTop: 10,
    paddingLeft: 46,
  },
  permToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.grey[100],
  },
  permToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  totalSalaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  totalSalaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalSalaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.grey[100],
    borderWidth: 1.5,
    borderColor: Colors.grey[200],
    minWidth: 48,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: Colors.background,
  },
  disabledButtonText: {
    color: Colors.textLight,
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
    maxHeight: '80%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
    
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  selectedOption: {
    backgroundColor: '#f0f4ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  otpModalContainer: {
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
  otpModalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  otpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
  },
  otpModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  otpModalMessage: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  otpDetailsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  otpDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  otpDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  otpDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  otpInstructions: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  otpInstructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 8,
  },
  otpInstructionsText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  otpConfirmButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  otpConfirmButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});