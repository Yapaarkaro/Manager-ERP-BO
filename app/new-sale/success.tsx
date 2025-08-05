import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Download, Share, Printer, Chrome as Home, ShoppingCart, FileText, X } from 'lucide-react-native';

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

export default function SaleSuccessScreen() {
  const { paymentData } = useLocalSearchParams();
  const payment = JSON.parse(paymentData as string);
  const [showInvoice, setShowInvoice] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const applyRoundOff = (amount: number) => {
    const decimalPart = amount % 1;
    if (decimalPart < 0.50) {
      return Math.floor(amount); // Round down to nearest whole number
    } else {
      return Math.ceil(amount); // Round up to nearest whole number
    }
  };

  const getPaymentMethodText = () => {
    switch (payment.method) {
      case 'cash':
        return 'Cash Payment';
      case 'upi':
        return 'UPI Payment';
      case 'card':
        return 'Card Payment';
      case 'others':
        return payment.othersMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cheque Payment';
      default:
        return 'Payment';
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  const invoiceNumber = generateInvoiceNumber();

  const handleDownloadInvoice = () => {
    console.log('Download invoice:', invoiceNumber);
    // Implement download functionality
  };

  const handleShareInvoice = () => {
    console.log('Share invoice:', invoiceNumber);
    // Implement share functionality
  };

  const handlePrintInvoice = () => {
    console.log('Print invoice:', invoiceNumber);
    // Implement print functionality
  };

  const handleViewInvoice = () => {
    setShowInvoice(true);
  };

  const handleNewSale = () => {
    router.push('/new-sale');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
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
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your sale has been completed successfully
            </Text>
          </View>

          {/* Invoice Details */}
          <View style={styles.invoiceDetailsContainer}>
            <Text style={styles.invoiceNumber}>Invoice #{invoiceNumber}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{payment.customer.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mobile:</Text>
                <Text style={styles.detailValue}>{payment.customer.mobile}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{getPaymentMethodText()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {formatAmount(payment.amount)}
                </Text>
              </View>

              {payment.method === 'cash' && payment.balance > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance Returned:</Text>
                  <Text style={[styles.detailValue, styles.balanceValue]}>
                    {formatAmount(payment.balance)}
                  </Text>
                </View>
              )}

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
              onPress={handleViewInvoice}
              activeOpacity={0.7}
            >
              <FileText size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>View Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadInvoice}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareInvoice}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintInvoice}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.newSaleButton}
              onPress={handleNewSale}
              activeOpacity={0.8}
            >
              <ShoppingCart size={20} color="#ffffff" />
              <Text style={styles.newSaleButtonText}>New Sale</Text>
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

      {/* Invoice Modal */}
      <Modal
        visible={showInvoice}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInvoice(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tax Invoice</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInvoice(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Invoice Title */}
              <View style={styles.invoiceTitleSection}>
                <Text style={styles.invoiceTitle}>Tax Invoice</Text>
                <Text style={styles.invoiceNumberText}>Invoice #{invoiceNumber}</Text>
                <Text style={styles.invoiceDateTime}>
                  Date: {new Date().toLocaleDateString('en-IN')} | Time: {new Date().toLocaleTimeString('en-IN')}
                </Text>
              </View>

              {/* Business Details */}
              <View style={styles.businessSection}>
                <Text style={styles.sectionTitle}>Business Details:</Text>
                <Text style={styles.companyName}>Your Company Name</Text>
                <Text style={styles.companyAddress}>123 Business Street</Text>
                <Text style={styles.companyAddress}>City, State - PIN</Text>
                <Text style={styles.companyGSTIN}>GSTIN: 12ABCDE1234F1Z5</Text>
              </View>

              {/* Customer Details */}
              <View style={styles.customerSection}>
                <Text style={styles.sectionTitle}>
                  {payment.customer.isBusinessCustomer ? 'Business Details:' : 'Customer Details:'}
                </Text>
                {payment.customer.isBusinessCustomer ? (
                  <>
                    <Text style={styles.customerName}>{payment.customer.businessName || payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Contact: {payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Mobile: {payment.customer.mobile}</Text>
                    {payment.customer.gstin && (
                      <Text style={styles.customerGSTIN}>GSTIN: {payment.customer.gstin}</Text>
                    )}
                    <Text style={styles.customerAddress}>
                      {payment.customer.businessAddress || payment.customer.address}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.customerName}>{payment.customer.name}</Text>
                    <Text style={styles.customerMobile}>Mobile: {payment.customer.mobile}</Text>
                    <Text style={styles.customerAddress}>{payment.customer.address}</Text>
                  </>
                )}
              </View>

              {/* Items Table */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items:</Text>
                
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.srColumn]}>Sr No</Text>
                  <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item Name & HSN Code</Text>
                  <Text style={[styles.tableHeaderText, styles.detailsColumn]}>Quantity, Rate & Amount</Text>
                </View>

                {/* Table Rows */}
                {payment.cartItems.map((item: any, index: number) => {
                  const itemTotal = item.price * item.quantity;
                  let basePrice = itemTotal;
                  
                  // Apply item discount if any
                  if (item.discountValue && item.discountValue > 0) {
                    if (item.discountType === 'percentage') {
                      basePrice = basePrice * (1 - item.discountValue / 100);
                    } else {
                      basePrice = basePrice - item.discountValue;
                    }
                  }
                  
                  // Calculate GST
                  const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                  
                  // Calculate CESS
                  let cessAmount = 0;
                  if (item.cessType && item.cessType !== 'none') {
                    if (item.cessType === 'value') {
                      cessAmount = basePrice * ((item.cessRate || 0) / 100);
                    } else if (item.cessType === 'quantity') {
                      cessAmount = (item.cessAmount || 0) * item.quantity;
                    } else if (item.cessType === 'value_and_quantity') {
                      const valueCess = basePrice * ((item.cessRate || 0) / 100);
                      const quantityCess = (item.cessAmount || 0) * item.quantity;
                      cessAmount = valueCess + quantityCess;
                    }
                  }
                  
                  const itemGrandTotal = basePrice + taxAmount + cessAmount;
                  
                  return (
                    <View key={index} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.srColumn]}>
                        <Text style={styles.srNumber}>{index + 1}</Text>
                      </View>
                      <View style={[styles.tableCell, styles.itemColumn]}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemHSN}>HSN: {item.hsnCode || item.category}</Text>
                      </View>
                      <View style={[styles.tableCell, styles.detailsColumn]}>
                        <Text style={styles.itemDetails}>
                          {item.quantity} × {formatAmount(item.price)} per {item.primaryUnit || 'unit'}
                        </Text>
                        <Text style={styles.itemAmount}>
                          Amount: {formatAmount(applyRoundOff(itemTotal))}
                        </Text>
                        {item.taxRate && item.taxRate > 0 && (
                          <Text style={styles.itemTax}>
                            GST ({item.taxRate}%): {formatAmount(applyRoundOff(taxAmount))}
                          </Text>
                        )}
                        {item.cessType && item.cessType !== 'none' && (
                          <Text style={styles.itemCess}>
                            CESS: {formatAmount(applyRoundOff(cessAmount))}
                          </Text>
                        )}
                        <Text style={styles.itemTotal}>
                          Total: {formatAmount(applyRoundOff(itemGrandTotal))}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>



              {/* Invoice Totals */}
              <View style={styles.totalsSection}>
                <Text style={styles.totalsTitle}>Invoice Summary</Text>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Invoice Total:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = item.price * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + basePrice + taxAmount + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Whole Invoice GST Amount:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = item.price * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      return total + (basePrice * ((item.taxRate || 0) / 100));
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Whole Invoice CESS Total:</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = item.price * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount (if any):</Text>
                  <Text style={styles.totalAmount}>
                    {formatAmount(applyRoundOff(0))} {/* Add discount calculation if available */}
                  </Text>
                </View>
                
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Invoice Total:</Text>
                  <Text style={styles.grandTotalAmount}>
                    {formatAmount(applyRoundOff(payment.cartItems.reduce((total: number, item: any) => {
                      const itemTotal = item.price * item.quantity;
                      let basePrice = itemTotal;
                      
                      // Apply item discount if any
                      if (item.discountValue && item.discountValue > 0) {
                        if (item.discountType === 'percentage') {
                          basePrice = basePrice * (1 - item.discountValue / 100);
                        } else {
                          basePrice = basePrice - item.discountValue;
                        }
                      }
                      
                      const taxAmount = basePrice * ((item.taxRate || 0) / 100);
                      
                      let cessAmount = 0;
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = basePrice * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = (item.cessAmount || 0) * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = basePrice * ((item.cessRate || 0) / 100);
                          const quantityCess = (item.cessAmount || 0) * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        }
                      }
                      
                      return total + basePrice + taxAmount + cessAmount;
                    }, 0)))}
                  </Text>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Method:</Text>
                <Text style={styles.paymentMethod}>{getPaymentMethodText()}</Text>
                {payment.method === 'cash' && payment.balance > 0 && (
                  <Text style={styles.paymentBalance}>Balance Returned: {formatAmount(payment.balance)}</Text>
                )}
              </View>

              {/* Thank You Note */}
              <View style={styles.thankYouSection}>
                <Text style={styles.thankYouText}>Thank you for your business!</Text>
                <Text style={styles.thankYouSubtext}>This is a computer generated invoice</Text>
              </View>
            </ScrollView>
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
  invoiceDetailsContainer: {
    width: '100%',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  invoiceNumber: {
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
    color: Colors.success,
  },
  balanceValue: {
    color: Colors.warning,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
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
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  newSaleButtonText: {
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
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dashboardButtonText: {
    color: '#3f66ac',
    fontSize: 16,
    fontWeight: '600',
  },
  // Invoice Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  invoiceTitleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  invoiceNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  invoiceDateTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  businessSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  companyGSTIN: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  invoiceInfo: {
    alignItems: 'flex-end',
  },
  invoiceNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  invoiceTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  customerSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  customerMobile: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  customerGSTIN: {
    fontSize: 12,
    color: Colors.textLight,
  },
  customerAddress: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  taxBreakdownSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  taxAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  taxDetails: {
    marginLeft: 16,
    marginBottom: 12,
  },
  taxDetailRow: {
    marginBottom: 4,
  },
  taxDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  taxDetailText: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 14,
  },
  itemsSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    alignItems: 'flex-start',
  },
  tableCell: {
    fontSize: 11,
    color: Colors.text,
  },
  srColumn: {
    flex: 0.5,
    textAlign: 'center',
  },
  itemColumn: {
    flex: 2,
  },
  detailsColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  itemHSN: {
    fontSize: 9,
    color: Colors.textLight,
  },
  srNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  itemDetails: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemAmount: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 3,
  },
  itemTax: {
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 3,
  },
  itemCess: {
    fontSize: 11,
    color: Colors.warning,
    marginBottom: 3,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
  },
  totalsSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[300],
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  grandTotalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  paymentBalance: {
    fontSize: 12,
    color: Colors.warning,
  },
  invoiceFooter: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  footerText: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 2,
  },
  thankYouSection: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 4,
  },
  thankYouSubtext: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
});