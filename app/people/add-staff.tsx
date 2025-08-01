import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  Search,
  X,
  Check,
  MessageSquare
} from 'lucide-react-native';

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
  { id: 'sales', label: 'Sales Management', description: 'Create and manage sales transactions' },
  { id: 'inventory', label: 'Inventory Management', description: 'Manage stock and inventory' },
  { id: 'customer_management', label: 'Customer Management', description: 'Manage customer information' },
  { id: 'payment_processing', label: 'Payment Processing', description: 'Process payments and refunds' },
  { id: 'reports', label: 'Reports Access', description: 'View and generate reports' },
  { id: 'staff_management', label: 'Staff Management', description: 'Manage other staff members' },
  { id: 'settings', label: 'Settings Access', description: 'Access system settings' },
];

interface StaffFormData {
  name: string;
  mobile: string;
  email: string;
  role: string;
  customRole: string;
  department: string;
  customDepartment: string;
  address: string;
  basicSalary: string;
  allowances: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  permissions: string[];
  monthlySalesTarget: string;
  monthlyInvoiceTarget: string;
}

export default function AddStaffScreen() {
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    mobile: '',
    email: '',
    role: '',
    customRole: '',
    department: '',
    customDepartment: '',
    address: '',
    basicSalary: '',
    allowances: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    permissions: [],
    monthlySalesTarget: '',
    monthlyInvoiceTarget: '',
  });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const roleSearchRef = useRef<TextInput>(null);
  const departmentSearchRef = useRef<TextInput>(null);

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

  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = formData.permissions;
    if (currentPermissions.includes(permissionId)) {
      updateFormData('permissions', currentPermissions.filter(p => p !== permissionId));
    } else {
      updateFormData('permissions', [...currentPermissions, permissionId]);
    }
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

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.mobile.length === 10 &&
      formData.email.trim().length > 0 &&
      formData.email.includes('@') &&
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

  const generateEmployeeId = () => {
    const prefix = 'EMP';
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}${number}`;
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Generate employee ID and OTP
    const employeeId = generateEmployeeId();
    const otp = generateOtp();
    
    setGeneratedEmployeeId(employeeId);
    setGeneratedOtp(otp);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowOtpModal(true);
    }, 2000);
  };

  const handleOtpConfirm = () => {
    setShowOtpModal(false);
    Alert.alert(
      'Staff Added Successfully',
      `${formData.name} has been added to your team. They will receive an OTP to join using the Manager Staff App.`,
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const formatAmount = (amount: string) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseInt(amount));
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
          
          <Text style={styles.headerTitle}>Add New Staff</Text>
        </View>

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
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.mobile}
                  onChangeText={handleMobileChange}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text.toLowerCase())}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  value={formData.address}
                  onChangeText={(text) => updateFormData('address', text)}
                  placeholder="Enter complete address"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Job Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role *</Text>
              {formData.role === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.customRole}
                      onChangeText={(text) => updateFormData('customRole', text)}
                      placeholder="Enter custom role"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
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
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.customDepartment}
                      onChangeText={(text) => updateFormData('customDepartment', text)}
                      placeholder="Enter custom department"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
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
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowPermissionsModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownText,
                  formData.permissions.length === 0 && styles.placeholderText
                ]}>
                  {formData.permissions.length === 0 
                    ? 'Select permissions' 
                    : `${formData.permissions.length} permissions selected`
                  }
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
              {formData.permissions.length > 0 && (
                <View style={styles.selectedPermissions}>
                  {formData.permissions.map(permissionId => {
                    const permission = permissions.find(p => p.id === permissionId);
                    return (
                      <View key={permissionId} style={styles.permissionChip}>
                        <Text style={styles.permissionChipText}>
                          {permission?.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Salary Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Salary Information</Text>
            
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Basic Salary *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.basicSalary}
                    onChangeText={(text) => handleSalaryChange('basicSalary', text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Allowances</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.allowances}
                    onChangeText={(text) => handleSalaryChange('allowances', text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
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

          {/* Targets (for sales roles) */}
          {(formData.role.toLowerCase().includes('sales') || formData.customRole.toLowerCase().includes('sales')) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Targets</Text>
              
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Sales Target</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.monthlySalesTarget}
                      onChangeText={(text) => handleTargetChange('monthlySalesTarget', text)}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Invoice Target</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.monthlyInvoiceTarget}
                    onChangeText={(text) => handleTargetChange('monthlyInvoiceTarget', text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Name *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.emergencyContactName}
                  onChangeText={(text) => updateFormData('emergencyContactName', text)}
                  placeholder="Enter emergency contact name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relation</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContactRelation}
                onChangeText={(text) => updateFormData('emergencyContactRelation', text)}
                placeholder="e.g., Spouse, Father, Mother"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.emergencyContactPhone}
                  onChangeText={handleEmergencyPhoneChange}
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
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
              {isSubmitting ? 'Adding Staff...' : 'Add Staff Member'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

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

        {/* Permissions Selection Modal */}
        <Modal
          visible={showPermissionsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPermissionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Permissions</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowPermissionsModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {permissions.map((permission) => (
                  <TouchableOpacity
                    key={permission.id}
                    style={[
                      styles.permissionOption,
                      formData.permissions.includes(permission.id) && styles.selectedPermissionOption
                    ]}
                    onPress={() => handlePermissionToggle(permission.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.permissionInfo}>
                      <Text style={[
                        styles.permissionLabel,
                        formData.permissions.includes(permission.id) && styles.selectedPermissionLabel
                      ]}>
                        {permission.label}
                      </Text>
                      <Text style={styles.permissionDescription}>
                        {permission.description}
                      </Text>
                    </View>
                    {formData.permissions.includes(permission.id) && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
                    {'\n'}2. Ask them to download the "Manager Staff App"
                    {'\n'}3. They can use the OTP to join your business
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
    alignItems: 'flex-start',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    outlineStyle: 'none',
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
  selectedPermissions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  permissionChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  permissionChipText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '500',
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
    outlineStyle: 'none',
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
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    gap: 12,
  },
  selectedPermissionOption: {
    backgroundColor: '#f0f4ff',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedPermissionLabel: {
    color: Colors.primary,
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 14,
    color: Colors.textLight,
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