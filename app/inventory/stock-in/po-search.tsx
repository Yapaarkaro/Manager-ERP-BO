import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  FileText,
  Package,
  Check,
  AlertTriangle,
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

interface POProduct {
  id: string;
  name: string;
  billedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'received' | 'partial' | 'excess';
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierGSTIN: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'pending' | 'partial' | 'received';
  products: POProduct[];
}

const mockPOs: PurchaseOrder[] = [
  {
    id: 'po_001',
    poNumber: 'PO-2024-001',
    supplierName: 'ABC Suppliers Pvt Ltd',
    supplierGSTIN: '27ABCDE1234F1Z5',
    orderDate: '2024-01-15',
    expectedDelivery: '2024-01-25',
    totalAmount: 50000,
    status: 'partial',
    products: [
      {
        id: 'prod_1',
        name: 'Laptop',
        billedQuantity: 10,
        receivedQuantity: 8,
        unitPrice: 45000,
        totalPrice: 450000,
        status: 'partial',
      },
      {
        id: 'prod_2',
        name: 'Mouse',
        billedQuantity: 20,
        receivedQuantity: 20,
        unitPrice: 500,
        totalPrice: 10000,
        status: 'received',
      },
      {
        id: 'prod_3',
        name: 'Keyboard',
        billedQuantity: 15,
        receivedQuantity: 0,
        unitPrice: 2000,
        totalPrice: 30000,
        status: 'pending',
      },
    ],
  },
  {
    id: 'po_002',
    poNumber: 'PO-2024-002',
    supplierName: 'XYZ Electronics',
    supplierGSTIN: '29XYZABC5678G9H0',
    orderDate: '2024-01-20',
    expectedDelivery: '2024-01-30',
    totalAmount: 75000,
    status: 'pending',
    products: [
      {
        id: 'prod_4',
        name: 'Monitor',
        billedQuantity: 5,
        receivedQuantity: 0,
        unitPrice: 15000,
        totalPrice: 75000,
        status: 'pending',
      },
    ],
  },
];

export default function POSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filteredPOs = mockPOs.filter(po =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePOSelect = (po: PurchaseOrder) => {
    setSelectedPO(po);
  };

  const handleVerifyStock = () => {
    if (!selectedPO) return;
    
    router.push({
      pathname: '/inventory/stock-in/verify-stock',
      params: {
        poData: JSON.stringify(selectedPO)
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return Colors.success;
      case 'partial':
        return Colors.warning;
      case 'pending':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'partial':
        return 'Partial';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getProductStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return Colors.success;
      case 'partial':
        return Colors.warning;
      case 'excess':
        return Colors.error;
      case 'pending':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Search Purchase Orders</Text>
        </View>

        <View style={styles.content}>
          {/* PO List */}
          <ScrollView style={styles.poList} showsVerticalScrollIndicator={false}>
            {filteredPOs.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>No purchase orders found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try searching with a different term
                </Text>
              </View>
            ) : (
              filteredPOs.map((po) => (
                <TouchableOpacity
                  key={po.id}
                  style={[
                    styles.poCard,
                    selectedPO?.id === po.id && styles.selectedPOCard
                  ]}
                  onPress={() => handlePOSelect(po)}
                  activeOpacity={0.8}
                >
                  <View style={styles.poHeader}>
                    <View style={styles.poInfo}>
                      <Text style={styles.poNumber}>{po.poNumber}</Text>
                      <Text style={styles.supplierName}>{po.supplierName}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(po.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(po.status) }
                      ]}>
                        {getStatusText(po.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.poDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order Date:</Text>
                      <Text style={styles.detailValue}>{po.orderDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expected Delivery:</Text>
                      <Text style={styles.detailValue}>{po.expectedDelivery}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount:</Text>
                      <Text style={styles.detailValue}>₹{po.totalAmount.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Products Summary */}
                  <View style={styles.productsSummary}>
                    <Text style={styles.productsTitle}>Products:</Text>
                    {po.products.map((product) => (
                      <View key={product.id} style={styles.productItem}>
                        <View style={styles.productInfo}>
                          <Package size={16} color={Colors.textLight} />
                          <Text style={styles.productName}>{product.name}</Text>
                        </View>
                        <View style={styles.productQuantities}>
                          <Text style={styles.quantityText}>
                            {product.receivedQuantity}/{product.billedQuantity}
                          </Text>
                          <View style={[
                            styles.productStatusBadge,
                            { backgroundColor: getProductStatusColor(product.status) + '20' }
                          ]}>
                            <Text style={[
                              styles.productStatusText,
                              { color: getProductStatusColor(product.status) }
                            ]}>
                              {product.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {selectedPO?.id === po.id && (
                    <View style={styles.selectedActions}>
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={handleVerifyStock}
                        activeOpacity={0.8}
                      >
                        <Check size={20} color={Colors.background} />
                        <Text style={styles.verifyButtonText}>Verify Stock</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Search Bar at Bottom */}
          <View style={styles.bottomSearchContainer}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by PO number or supplier name..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  poList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  poCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPOCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  poInfo: {
    flex: 1,
  },
  poNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 14,
    color: Colors.textLight,
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
  poDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  productsSummary: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  productQuantities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  productStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  selectedActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  bottomSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
}); 