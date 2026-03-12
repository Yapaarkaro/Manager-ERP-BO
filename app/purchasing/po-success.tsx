import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { 
  CircleCheck as CheckCircle, 
  Download, 
  Share, 
  Printer, 
  Chrome as Home, 
  ShoppingCart,
  Eye,
  FileText
} from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';

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

export default function POSuccessScreen() {
  const { poData } = useLocalSearchParams();
  const po = JSON.parse(poData as string);
  const navigation = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      safeRouter.replace('/dashboard');
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      safeRouter.replace('/dashboard');
    });
    return unsubscribe;
  }, [navigation]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadPO = () => {
    console.log('Download PO:', po.poNumber);
  };

  const handleSharePO = () => {
    console.log('Share PO:', po.poNumber);
  };

  const handlePrintPO = () => {
    console.log('Print PO:', po.poNumber);
  };

  const handleCreateAnother = () => {
    safeRouter.push('/purchasing/purchases');
  };

  const handleGoToDashboard = () => {
    safeRouter.replace('/dashboard');
  };

  const handleViewPODetails = () => {
    const productsArr = po.products || [];
    const itemsArr = po.items || [];

    const normalizedItems = itemsArr.length > 0
      ? itemsArr.map((it: any) => ({
          id: it.productId || it.id || '',
          name: it.productName || it.name || '',
          quantity: it.quantity || 0,
          price: it.unitPrice || it.price || 0,
          total: it.totalPrice || it.total || (it.quantity * (it.unitPrice || it.price || 0)),
        }))
      : productsArr.map((p: any) => ({
          id: p.id || '',
          name: p.name || '',
          quantity: p.orderQuantity || p.quantity || 0,
          price: p.price || p.unitPrice || 0,
          total: (p.orderQuantity || p.quantity || 0) * (p.price || p.unitPrice || 0),
        }));

    const detailData = {
      id: po.id || po.poNumber,
      poNumber: po.poNumber,
      supplierName: po.supplier?.businessName || po.supplier?.name || po.supplierName || '',
      supplierType: po.supplier?.supplierType || 'business',
      businessName: po.supplier?.businessName || '',
      gstin: po.supplier?.gstin || '',
      staffName: po.staffName || '',
      staffAvatar: '',
      status: po.status || 'sent',
      type: 'created' as const,
      amount: po.grandTotal || po.totalAmount || 0,
      itemCount: normalizedItems.length,
      date: po.createdAt || new Date().toISOString(),
      expectedDelivery: po.expectedDelivery || '',
      supplierAvatar: '',
      items: normalizedItems,
      terms: '',
      notes: po.notes || '',
      supplierId: po.supplier?.id || '',
    };

    safeRouter.push({
      pathname: '/purchasing/po-details',
      params: {
        poId: detailData.id,
        poData: JSON.stringify(detailData),
      },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconWrapper}>
              <CheckCircle size={64} color={Colors.success} />
            </View>
          </View>

          {/* Success Message */}
          <View style={styles.successMessageContainer}>
            <Text style={styles.successTitle}>Purchase Order Created!</Text>
            <Text style={styles.successSubtitle}>
              Your purchase order has been sent to the supplier
            </Text>
          </View>

          {/* PO Details */}
          <View style={styles.poDetailsContainer}>
            <Text style={styles.poNumber}>PO #{po.poNumber}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier:</Text>
                <Text style={styles.detailValue}>
                  {po.supplier?.businessName || po.supplier?.name || po.supplierName || ''}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Products:</Text>
                <Text style={styles.detailValue}>
                  {(po.products || po.items || []).reduce((sum: number, p: any) => sum + (p.orderQuantity || p.quantity || 0), 0)} items
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {formatAmount(po.grandTotal)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expected Delivery:</Text>
                <Text style={styles.detailValue}>
                  {po.expectedDelivery
                    ? new Date(po.expectedDelivery).toLocaleDateString('en-IN')
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadPO}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSharePO}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintPO}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewPODetails}
              activeOpacity={0.7}
            >
              <Eye size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.createAnotherButton}
              onPress={handleCreateAnother}
              activeOpacity={0.8}
            >
              <ShoppingCart size={20} color="#ffffff" />
              <Text style={styles.createAnotherButtonText}>Create Another PO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={handleGoToDashboard}
              activeOpacity={0.8}
            >
              <Home size={20} color={Colors.primary} />
              <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  poDetailsContainer: {
    width: '100%',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  poNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 16,
    color: Colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  navigationContainer: {
    width: '100%',
    gap: 12,
  },
  createAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  createAnotherButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dashboardButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});