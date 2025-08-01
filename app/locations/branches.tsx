import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Building2, MapPin, Plus, CreditCard as Edit3, Trash2, Search, Filter, X } from 'lucide-react-native';

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

interface Branch {
  id: string;
  name: string;
  type: 'branch';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  stateName: string;
  stateCode: string;
  isPrimary: boolean;
  createdAt: string;
  manager?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

// Mock branch data
const mockBranches: Branch[] = [
  {
    id: 'branch_001',
    name: 'Main Branch - Delhi',
    type: 'branch',
    doorNumber: '123',
    addressLine1: 'Connaught Place',
    addressLine2: 'Central Delhi',
    city: 'New Delhi',
    pincode: '110001',
    stateName: 'Delhi',
    stateCode: '07',
    isPrimary: true,
    createdAt: '2024-01-01',
    manager: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    status: 'active'
  },
  {
    id: 'branch_002',
    name: 'Branch Office - Mumbai',
    type: 'branch',
    doorNumber: '456',
    addressLine1: 'Bandra West',
    addressLine2: 'Near Linking Road',
    city: 'Mumbai',
    pincode: '400050',
    stateName: 'Maharashtra',
    stateCode: '27',
    isPrimary: false,
    createdAt: '2024-01-15',
    manager: 'Priya Sharma',
    phone: '+91 87654 32109',
    status: 'active'
  },
  {
    id: 'branch_003',
    name: 'Regional Office - Bangalore',
    type: 'branch',
    doorNumber: '789',
    addressLine1: 'Koramangala',
    addressLine2: '5th Block',
    city: 'Bangalore',
    pincode: '560095',
    stateName: 'Karnataka',
    stateCode: '29',
    isPrimary: false,
    createdAt: '2024-02-01',
    manager: 'Amit Singh',
    phone: '+91 76543 21098',
    status: 'active'
  },
];

export default function BranchesScreen() {
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>(mockBranches);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Filter branches based on search query
    if (searchQuery.trim() === '') {
      setFilteredBranches(branches);
    } else {
      const filtered = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.manager?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.pincode.includes(searchQuery)
      );
      setFilteredBranches(filtered);
    }
  }, [searchQuery, branches]);

  const formatAddress = (branch: Branch) => {
    const parts = [
      branch.doorNumber,
      branch.addressLine1,
      branch.addressLine2,
      branch.city,
      `${branch.stateName} - ${branch.pincode}`
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  const handleAddBranch = () => {
    router.push('/locations/add-branch');
  };

  const handleEditBranch = (branch: Branch) => {
    router.push({
      pathname: '/locations/edit-branch',
      params: {
        branchId: branch.id,
        branchData: JSON.stringify(branch)
      }
    });
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranchToDelete(branchId);
    setShowDeleteModal(true);
  };

  const confirmDeleteBranch = () => {
    if (branchToDelete) {
      setBranches(prev => prev.filter(branch => branch.id !== branchToDelete));
      setBranchToDelete(null);
      setShowDeleteModal(false);
      Alert.alert('Success', 'Branch deleted successfully');
    }
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Implement filter functionality
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? Colors.success : Colors.error;
  };

  const renderBranchCard = (branch: Branch) => {
    return (
      <View key={branch.id} style={styles.branchCard}>
        {/* Header */}
        <View style={styles.branchHeader}>
          <View style={styles.branchLeft}>
            <View style={styles.branchIconContainer}>
              <Building2 size={24} color={Colors.primary} />
            </View>
            <View style={styles.branchInfo}>
              <Text style={styles.branchName}>{branch.name}</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(branch.status)}20` }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(branch.status) }
                  ]}>
                    {branch.status.toUpperCase()}
                  </Text>
                </View>
                {branch.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryText}>PRIMARY</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.branchActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditBranch(branch)}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color={Colors.textLight} />
            </TouchableOpacity>
            {!branch.isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteBranch(branch.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressSection}>
          <MapPin size={16} color={Colors.textLight} />
          <Text style={styles.addressText}>{formatAddress(branch)}</Text>
        </View>

        {/* Manager & Contact */}
        {(branch.manager || branch.phone) && (
          <View style={styles.contactSection}>
            {branch.manager && (
              <Text style={styles.managerText}>Manager: {branch.manager}</Text>
            )}
            {branch.phone && (
              <Text style={styles.phoneText}>Phone: {branch.phone}</Text>
            )}
          </View>
        )}

        {/* GST State Code */}
        <View style={styles.gstSection}>
          <Text style={styles.gstLabel}>GST State Code:</Text>
          <Text style={styles.gstCode}>{branch.stateCode}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Branch Offices</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.totalCount}>
              {filteredBranches.length} branches
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Branches List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBranches.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Branches Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No branches match your search criteria' : 'Add your first branch office to get started'}
            </Text>
          </View>
        ) : (
          filteredBranches.map(renderBranchCard)
        )}
      </ScrollView>

      {/* Add Branch FAB */}
      <TouchableOpacity
        style={styles.addBranchFAB}
        onPress={handleAddBranch}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addBranchText}>Add Branch</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search branches..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={handleFilter}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Branch</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this branch? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteBranch}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
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
  branchCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  branchLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  branchIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBadge: {
    backgroundColor: '#ffc754',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
  },
  branchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
  },
  contactSection: {
    marginBottom: 12,
  },
  managerText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  gstSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  gstLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 8,
  },
  gstCode: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  addBranchFAB: {
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
  addBranchText: {
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
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});