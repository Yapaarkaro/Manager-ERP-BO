import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  ShoppingCart,
  RotateCcw,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  User
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

interface DailySalesData {
  date: string;
  totalSales: number;
  totalReturns: number;
  netSales: number;
  invoiceCount: number;
  returnCount: number;
  paymentBreakdown: {
    cash: { gross: number; returns: number; net: number; };
    upi: { gross: number; returns: number; net: number; };
    card: { gross: number; returns: number; net: number; };
    others: { gross: number; returns: number; net: number; };
  };
  invoices: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerType: 'individual' | 'business';
    amount: number;
    paymentMethod: 'cash' | 'upi' | 'card' | 'others';
    staffName: string;
    staffAvatar: string;
    time: string;
    status: 'sale' | 'return';
    originalInvoice?: string;
  }[];
}

const mockDailySalesData: DailySalesData[] = [
  {
    date: '2024-01-16',
    totalSales: 125000,
    totalReturns: 8500,
    netSales: 116500,
    invoiceCount: 12,
    returnCount: 2,
    paymentBreakdown: {
      cash: { gross: 45000, returns: 5500, net: 39500 },
      upi: { gross: 50000, returns: 3000, net: 47000 },
      card: { gross: 25000, returns: 0, net: 25000 },
      others: { gross: 5000, returns: 0, net: 5000 }
    },
    invoices: [
      {
        id: '1',
        invoiceNumber: 'INV-2024-001',
        customerName: 'Rajesh Kumar',
        customerType: 'individual',
        amount: 15500,
        paymentMethod: 'cash',
        staffName: 'Priya Sharma',
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '09:30 AM',
        status: 'sale'
      },
      {
        id: '2',
        invoiceNumber: 'RET-2024-001',
        customerName: 'Rajesh Kumar',
        customerType: 'individual',
        amount: 5500,
        paymentMethod: 'cash',
        staffName: 'Priya Sharma',
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '02:15 PM',
        status: 'return',
        originalInvoice: 'INV-2024-001'
      },
      {
        id: '3',
        invoiceNumber: 'INV-2024-002',
        customerName: 'TechCorp Solutions',
        customerType: 'business',
        amount: 35000,
        paymentMethod: 'upi',
        staffName: 'Rajesh Kumar',
        staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '11:45 AM',
        status: 'sale'
      },
      {
        id: '4',
        invoiceNumber: 'INV-2024-003',
        customerName: 'Sunita Devi',
        customerType: 'individual',
        amount: 22000,
        paymentMethod: 'card',
        staffName: 'Amit Singh',
        staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '03:20 PM',
        status: 'sale'
      },
      {
        id: '5',
        invoiceNumber: 'RET-2024-002',
        customerName: 'Global Enterprises',
        customerType: 'business',
        amount: 3000,
        paymentMethod: 'upi',
        staffName: 'Priya Sharma',
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '04:30 PM',
        status: 'return',
        originalInvoice: 'INV-2024-002'
      }
    ]
  },
  {
    date: '2024-01-15',
    totalSales: 98000,
    totalReturns: 12000,
    netSales: 86000,
    invoiceCount: 8,
    returnCount: 3,
    paymentBreakdown: {
      cash: { gross: 35000, returns: 8000, net: 27000 },
      upi: { gross: 40000, returns: 4000, net: 36000 },
      card: { gross: 18000, returns: 0, net: 18000 },
      others: { gross: 5000, returns: 0, net: 5000 }
    },
    invoices: [
      {
        id: '6',
        invoiceNumber: 'INV-2024-004',
        customerName: 'Metro Retail Chain',
        customerType: 'business',
        amount: 45000,
        paymentMethod: 'upi',
        staffName: 'Rajesh Kumar',
        staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '10:15 AM',
        status: 'sale'
      },
      {
        id: '7',
        invoiceNumber: 'INV-2024-005',
        customerName: 'Vikram Patel',
        customerType: 'individual',
        amount: 28000,
        paymentMethod: 'cash',
        staffName: 'Priya Sharma',
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        time: '01:30 PM',
        status: 'sale'
      }
    ]
  },
  {
    date: '2024-01-14',
    totalSales: 156000,
    totalReturns: 15000,
    netSales: 141000,
    invoiceCount: 15,
    returnCount: 4,
    paymentBreakdown: {
      cash: { gross: 60000, returns: 10000, net: 50000 },
      upi: { gross: 70000, returns: 5000, net: 65000 },
      card: { gross: 20000, returns: 0, net: 20000 },
      others: { gross: 6000, returns: 0, net: 6000 }
    },
    invoices: []
  }
];

export default function ReportsScreen() {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['2024-01-16']));
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DailySalesData | null>(null);

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const handlePaymentMethodPress = (dayData: DailySalesData, paymentMethod: string) => {
    setSelectedDayData(dayData);
    setSelectedPaymentMethod(paymentMethod);
    
    // Filter invoices by payment method
    const filteredInvoices = dayData.invoices.filter(invoice => 
      invoice.paymentMethod === paymentMethod
    );

    router.push({
      pathname: '/reports/payment-details',
      params: {
        date: dayData.date,
        paymentMethod: paymentMethod,
        invoices: JSON.stringify(filteredInvoices),
        paymentData: JSON.stringify(dayData.paymentBreakdown[paymentMethod as keyof typeof dayData.paymentBreakdown])
      }
    });
  };

  const handleInvoicePress = (invoice: any) => {
    if (invoice.status === 'return') {
      // Navigate to return details
      const returnData = {
        id: invoice.id,
        returnNumber: invoice.invoiceNumber,
        originalInvoiceNumber: invoice.originalInvoice || 'INV-2024-001',
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        refundStatus: 'refunded',
        amount: invoice.amount,
        itemCount: 1,
        date: selectedDayData?.date || '2024-01-16',
        reason: 'Customer return',
        customerDetails: {
          name: invoice.customerName,
          mobile: '+91 98765 43210',
          address: '123, Sample Address, City - 560001'
        }
      };

      router.push({
        pathname: '/return-details',
        params: {
          returnId: returnData.id,
          returnData: JSON.stringify(returnData)
        }
      });
    } else {
      // Navigate to invoice details
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        paymentStatus: 'paid',
        amount: invoice.amount,
        itemCount: 2,
        date: selectedDayData?.date || '2024-01-16',
        customerDetails: {
          name: invoice.customerName,
          mobile: '+91 98765 43210',
          businessName: invoice.customerType === 'business' ? invoice.customerName : undefined,
          address: '123, Sample Address, City - 560001'
        }
      };

      router.push({
        pathname: '/invoice-details',
        params: {
          invoiceId: invoiceData.id,
          invoiceData: JSON.stringify(invoiceData)
        }
      });
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
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'upi': return Smartphone;
      case 'card': return CreditCard;
      case 'others': return Building2;
      default: return IndianRupee;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return Colors.success;
      case 'upi': return Colors.primary;
      case 'card': return Colors.warning;
      case 'others': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Others';
      default: return method;
    }
  };

  const renderPaymentMethodCard = (dayData: DailySalesData, method: string) => {
    const PaymentIcon = getPaymentMethodIcon(method);
    const paymentColor = getPaymentMethodColor(method);
    const paymentData = dayData.paymentBreakdown[method as keyof typeof dayData.paymentBreakdown];
    const invoiceCount = dayData.invoices.filter(inv => inv.paymentMethod === method).length;

    return (
      <TouchableOpacity
        key={method}
        style={[styles.paymentMethodCard, { borderColor: paymentColor }]}
        onPress={() => handlePaymentMethodPress(dayData, method)}
        activeOpacity={0.7}
      >
        <View style={styles.paymentMethodHeader}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: `${paymentColor}20` }]}>
            <PaymentIcon size={20} color={paymentColor} />
          </View>
          <Text style={styles.paymentMethodName}>
            {getPaymentMethodName(method)}
          </Text>
        </View>

        <View style={styles.paymentMethodStats}>
          <View style={styles.paymentStat}>
            <Text style={styles.paymentStatLabel}>Gross Sales</Text>
            <Text style={[styles.paymentStatValue, { color: paymentColor }]}>
              {formatAmount(paymentData.gross)}
            </Text>
          </View>

          {paymentData.returns > 0 && (
            <View style={styles.paymentStat}>
              <Text style={styles.paymentStatLabel}>Returns</Text>
              <Text style={[styles.paymentStatValue, { color: Colors.error }]}>
                -{formatAmount(paymentData.returns)}
              </Text>
            </View>
          )}

          <View style={[styles.paymentStat, styles.netStat]}>
            <Text style={styles.netStatLabel}>Net Amount</Text>
            <Text style={[styles.netStatValue, { color: paymentColor }]}>
              {formatAmount(paymentData.net)}
            </Text>
          </View>

          {invoiceCount > 0 && (
            <View style={styles.invoiceCountContainer}>
              <FileText size={14} color={Colors.textLight} />
              <Text style={styles.invoiceCountText}>
                {invoiceCount} {invoiceCount === 1 ? 'invoice' : 'invoices'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderInvoiceCard = (invoice: any) => {
    const isReturn = invoice.status === 'return';
    const statusColor = isReturn ? Colors.error : Colors.success;
    const StatusIcon = isReturn ? RotateCcw : ShoppingCart;

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, { borderLeftColor: statusColor }]}
        onPress={() => handleInvoicePress(invoice)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceLeft}>
            <View style={[styles.invoiceStatusIcon, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={16} color={statusColor} />
            </View>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              {isReturn && invoice.originalInvoice && (
                <Text style={styles.originalInvoice}>
                  Return for: {invoice.originalInvoice}
                </Text>
              )}
              <View style={styles.customerInfo}>
                {invoice.customerType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.customerName}>{invoice.customerName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.invoiceRight}>
            <Text style={[
              styles.invoiceAmount,
              { color: isReturn ? Colors.error : Colors.success }
            ]}>
              {isReturn ? '-' : ''}{formatAmount(invoice.amount)}
            </Text>
            <Text style={styles.invoiceTime}>{invoice.time}</Text>
            <View style={styles.paymentMethodBadge}>
              <Text style={styles.paymentMethodBadgeText}>
                {getPaymentMethodName(invoice.paymentMethod)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <View style={styles.staffInfo}>
            <Image 
              source={{ uri: invoice.staffAvatar }}
              style={styles.staffAvatar}
            />
            <Text style={styles.staffName}>Processed by {invoice.staffName}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.viewInvoiceButton}
            onPress={() => handleInvoicePress(invoice)}
            activeOpacity={0.7}
          >
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.viewInvoiceText}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDayCard = (dayData: DailySalesData) => {
    const isExpanded = expandedDays.has(dayData.date);
    const netTrend = dayData.netSales > dayData.totalSales * 0.9 ? 'positive' : 'negative';

    return (
      <View key={dayData.date} style={styles.dayCard}>
        {/* Day Header */}
        <TouchableOpacity
          style={styles.dayHeader}
          onPress={() => toggleDayExpansion(dayData.date)}
          activeOpacity={0.7}
        >
          <View style={styles.dayHeaderLeft}>
            <Calendar size={24} color={Colors.primary} />
            <View style={styles.dayInfo}>
              <Text style={styles.dayDate}>{formatDate(dayData.date)}</Text>
              <Text style={styles.dayStats}>
                {dayData.invoiceCount} sales • {dayData.returnCount} returns
              </Text>
            </View>
          </View>

          <View style={styles.dayHeaderRight}>
            <Text style={styles.dayNetSales}>
              {formatAmount(dayData.netSales)}
            </Text>
            <View style={styles.dayTrend}>
              {netTrend === 'positive' ? (
                <TrendingUp size={16} color={Colors.success} />
              ) : (
                <TrendingDown size={16} color={Colors.error} />
              )}
              <Text style={[
                styles.dayTrendText,
                { color: netTrend === 'positive' ? Colors.success : Colors.error }
              ]}>
                Net Sales
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={Colors.textLight} />
            ) : (
              <ChevronDown size={20} color={Colors.textLight} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.dayContent}>
            {/* Sales Summary */}
            <View style={styles.salesSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gross Sales:</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  {formatAmount(dayData.totalSales)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Returns:</Text>
                <Text style={[styles.summaryValue, { color: Colors.error }]}>
                  -{formatAmount(dayData.totalReturns)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.netSalesRow]}>
                <Text style={styles.netSalesLabel}>Net Sales:</Text>
                <Text style={styles.netSalesValue}>
                  {formatAmount(dayData.netSales)}
                </Text>
              </View>
            </View>

            {/* Payment Methods Breakdown */}
            <View style={styles.paymentMethodsSection}>
              <Text style={styles.paymentMethodsTitle}>Payment Methods Breakdown</Text>
              <View style={styles.paymentMethodsGrid}>
                {Object.keys(dayData.paymentBreakdown).map(method => 
                  renderPaymentMethodCard(dayData, method)
                )}
              </View>
            </View>

            {/* Recent Invoices */}
            {dayData.invoices.length > 0 && (
              <View style={styles.invoicesSection}>
                <Text style={styles.invoicesSectionTitle}>
                  Recent Transactions ({dayData.invoices.length})
                </Text>
                <View style={styles.invoicesList}>
                  {dayData.invoices.slice(0, 3).map(renderInvoiceCard)}
                  {dayData.invoices.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllInvoicesButton}
                      onPress={() => {
                        router.push({
                          pathname: '/reports/daily-invoices',
                          params: {
                            date: dayData.date,
                            invoices: JSON.stringify(dayData.invoices)
                          }
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAllInvoicesText}>
                        View All {dayData.invoices.length} Transactions
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const totalNetSales = mockDailySalesData.reduce((sum, day) => sum + day.netSales, 0);
  const totalInvoices = mockDailySalesData.reduce((sum, day) => sum + day.invoiceCount, 0);
  const totalReturns = mockDailySalesData.reduce((sum, day) => sum + day.returnCount, 0);

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
        
        <Text style={styles.headerTitle}>Business Reports</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <IndianRupee size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Net Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalNetSales)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Invoices</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {totalInvoices}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <RotateCcw size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Returns</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {totalReturns}
            </Text>
          </View>
        </View>
      </View>

      {/* Daily Reports */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.reportsHeader}>
          <Text style={styles.reportsTitle}>Daily Sales Reports</Text>
          <Text style={styles.reportsSubtitle}>
            Detailed breakdown of sales, returns, and payment methods
          </Text>
        </View>

        <View style={styles.daysList}>
          {mockDailySalesData.map(renderDayCard)}
        </View>
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
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
  },
  reportsHeader: {
    marginBottom: 20,
  },
  reportsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  reportsSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  daysList: {
    gap: 16,
  },
  dayCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
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
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  dayStats: {
    fontSize: 14,
    color: Colors.textLight,
  },
  dayHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dayNetSales: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  dayTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayTrendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayContent: {
    backgroundColor: Colors.grey[50],
    padding: 16,
  },
  salesSummary: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  netSalesRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  netSalesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  netSalesValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentMethodsSection: {
    marginBottom: 16,
  },
  paymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentMethodStats: {
    gap: 6,
  },
  paymentStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  paymentStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  netStat: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 6,
    marginTop: 6,
  },
  netStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  netStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  invoiceCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 4,
  },
  invoiceCountText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  invoicesSection: {
    marginBottom: 16,
  },
  invoicesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  invoicesList: {
    gap: 8,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  invoiceStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  originalInvoice: {
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  invoiceTime: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  paymentMethodBadge: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentMethodBadgeText: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  staffName: {
    fontSize: 11,
    color: Colors.textLight,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewInvoiceText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  viewAllInvoicesButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllInvoicesText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});