import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import {
  ArrowLeft,
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
  ChevronDown,
  ChevronUp,
  Package,
  Users,
  Wallet,
  BarChart3,
  PieChart,
  Receipt,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Calendar,
  Truck,
  Star,
} from 'lucide-react-native';
import { ListSkeleton } from '@/components/SkeletonLoader';
import {
  getInvoices,
  getReturns,
  getProducts,
  getPurchaseInvoices,
  getReceivables,
  getPayables,
  getCashTransactions,
  getWriteOffs,
  invalidateApiCache,
} from '@/services/backendApi';
import { useBusinessData } from '@/hooks/useBusinessData';
import ExportModal from '@/components/ExportModal';
import { ExportConfig } from '@/utils/exportUtils';

const C = {
  bg: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#3F66AC',
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  info: '#2563EB',
  infoBg: '#EFF6FF',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
};

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'lastMonth';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This FY',
  lastMonth: 'Last Month',
};

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0, 0);
      break;
    }
    case 'year': {
      const fyStartMonth = 3; // April (0-indexed)
      const fyYear = now.getMonth() >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fyYear, fyStartMonth, 1, 0, 0, 0, 0);
      break;
    }
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      return { start, end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start, end };
}

function inRange(dateStr: string | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

type SectionKey = 'sales' | 'gst' | 'pnl' | 'receivables' | 'payables' | 'inventory' | 'expenses' | 'cashflow';

export default function ReportsScreen() {
  const { handleBack } = useWebBackNavigation();
  const { data: businessData } = useBusinessData();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set());

  const [invoices, setInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [receivablesData, setReceivablesData] = useState<any[]>([]);
  const [payablesData, setPayablesData] = useState<any[]>([]);
  const [cashTxns, setCashTxns] = useState<any[]>([]);
  const [writeOffs, setWriteOffs] = useState<any[]>([]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      getInvoices(),
      getReturns(),
      getProducts(),
      getPurchaseInvoices(),
      getReceivables(),
      getPayables(),
      getCashTransactions(),
      getWriteOffs(),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value.success) setInvoices(results[0].value.invoices || []);
    if (results[1].status === 'fulfilled' && results[1].value.success) setReturns(results[1].value.returns || []);
    if (results[2].status === 'fulfilled' && results[2].value.success) setProducts(results[2].value.products || []);
    if (results[3].status === 'fulfilled' && results[3].value.success) setPurchaseInvoices(results[3].value.invoices || []);
    if (results[4].status === 'fulfilled' && results[4].value.success) setReceivablesData(results[4].value.receivables || []);
    if (results[5].status === 'fulfilled' && results[5].value.success) setPayablesData(results[5].value.payables || []);
    if (results[6].status === 'fulfilled' && results[6].value.success) setCashTxns(results[6].value.transactions || []);
    if (results[7].status === 'fulfilled' && results[7].value.success) setWriteOffs(results[7].value.writeOffs || []);

    setIsLoading(false);
  }, []);

  useEffect(() => { loadAllData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateApiCache();
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const toggleSection = (key: SectionKey) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  // ── Calculations ──────────────────────────────────────────────
  const { start, end } = getDateRange(period);

  const periodInvoices = invoices.filter(i => inRange(i.invoice_date || i.created_at, start, end));
  const periodReturns = returns.filter(r => inRange(r.return_date || r.created_at, start, end));
  const periodPurchases = purchaseInvoices.filter(p => inRange(p.invoice_date || p.created_at, start, end));
  const periodCashTxns = cashTxns.filter(t => inRange(t.transaction_date || t.created_at, start, end));
  const periodWriteOffs = writeOffs.filter(w => inRange(w.created_at, start, end));

  // ── 1. Sales ──────────────────────────────────────────────────
  const totalSalesGross = periodInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalReturnsAmt = periodReturns.reduce((s, r) => s + Number(r.refund_amount || r.total_amount || 0), 0);
  const netSales = totalSalesGross - totalReturnsAmt;
  const totalTaxCollected = periodInvoices.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
  const totalCessCollected = periodInvoices.reduce((s, i) => s + Number(i.cess_amount || 0), 0);

  const paymentMethodBreakdown = (() => {
    const methods: Record<string, { count: number; amount: number }> = {};
    periodInvoices.forEach(inv => {
      const m = (inv.payment_method || 'others').toLowerCase();
      if (!methods[m]) methods[m] = { count: 0, amount: 0 };
      methods[m].count++;
      methods[m].amount += Number(inv.total_amount || 0);
    });
    return methods;
  })();

  const dailySalesMap = (() => {
    const map: Record<string, { sales: number; returns: number; count: number }> = {};
    periodInvoices.forEach(inv => {
      const d = (inv.invoice_date || inv.created_at || '').substring(0, 10);
      if (!map[d]) map[d] = { sales: 0, returns: 0, count: 0 };
      map[d].sales += Number(inv.total_amount || 0);
      map[d].count++;
    });
    periodReturns.forEach(ret => {
      const d = (ret.return_date || ret.created_at || '').substring(0, 10);
      if (!map[d]) map[d] = { sales: 0, returns: 0, count: 0 };
      map[d].returns += Number(ret.refund_amount || ret.total_amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10);
  })();

  // ── 2. GST ────────────────────────────────────────────────────
  const outputGST = totalTaxCollected;
  const outputCess = totalCessCollected;
  const inputGST = periodPurchases.reduce((s, p) => s + Number(p.tax_amount || 0), 0);
  const inputCess = periodPurchases.reduce((s, p) => s + Number(p.cess_amount || 0), 0);
  const netGSTLiability = outputGST - inputGST;
  const netCessLiability = outputCess - inputCess;
  const cgst = outputGST / 2;
  const sgst = outputGST / 2;
  const inputCGST = inputGST / 2;
  const inputSGST = inputGST / 2;

  // HSN Summary from invoices
  const hsnSummary = (() => {
    const map: Record<string, { hsn: string; taxableValue: number; taxAmount: number; quantity: number }> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const hsn = item.hsn_code || 'N/A';
        if (!map[hsn]) map[hsn] = { hsn, taxableValue: 0, taxAmount: 0, quantity: 0 };
        const lineTotal = Number(item.total_price || 0) || (Number(item.unit_price || 0) * Number(item.quantity || 1));
        map[hsn].taxableValue += lineTotal - Number(item.tax_amount || 0);
        map[hsn].taxAmount += Number(item.tax_amount || 0);
        map[hsn].quantity += Number(item.quantity || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.taxAmount - a.taxAmount).slice(0, 10);
  })();

  // ── 3. P&L ────────────────────────────────────────────────────
  const writeOffTotal = periodWriteOffs.reduce((s, w) => s + Number(w.total_value || 0), 0);
  const revenue = netSales;
  const purchaseTotal = periodPurchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const cogs = purchaseTotal + writeOffTotal;
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const expenseCategories = ['rent', 'utilities', 'salaries', 'office_supplies', 'marketing', 'repairs', 'insurance', 'taxes', 'other'];
  const expenseBreakdown = (() => {
    const map: Record<string, number> = {};
    periodCashTxns.filter(t => t.type === 'debit' && expenseCategories.includes(t.category)).forEach(t => {
      const cat = t.category || 'other';
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return map;
  })();
  const totalExpenses = Object.values(expenseBreakdown).reduce((s, v) => s + v, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // ── 4. Receivables ────────────────────────────────────────────
  const totalReceivable = receivablesData.reduce((s, r) => s + Number(r.totalReceivable || 0), 0);
  const overdueReceivable = receivablesData.filter(r => Number(r.daysPastDue || 0) > 0).reduce((s, r) => s + Number(r.totalReceivable || 0), 0);
  const receivableAging = (() => {
    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    receivablesData.forEach(r => {
      const days = Number(r.daysPastDue || 0);
      const amt = Number(r.totalReceivable || 0);
      if (days <= 0) buckets.current += amt;
      else if (days <= 30) buckets['1_30'] += amt;
      else if (days <= 60) buckets['31_60'] += amt;
      else if (days <= 90) buckets['61_90'] += amt;
      else buckets['90_plus'] += amt;
    });
    return buckets;
  })();

  // ── 5. Payables ───────────────────────────────────────────────
  const totalPayable = payablesData.reduce((s, p) => s + Number(p.totalPayable || 0), 0);
  const overduePayable = payablesData.filter(p => Number(p.daysPastDue || 0) > 0).reduce((s, p) => s + Number(p.totalPayable || 0), 0);
  const payableAging = (() => {
    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    payablesData.forEach(p => {
      const days = Number(p.daysPastDue || 0);
      const amt = Number(p.totalPayable || 0);
      if (days <= 0) buckets.current += amt;
      else if (days <= 30) buckets['1_30'] += amt;
      else if (days <= 60) buckets['31_60'] += amt;
      else if (days <= 90) buckets['61_90'] += amt;
      else buckets['90_plus'] += amt;
    });
    return buckets;
  })();

  // ── 6. Inventory ──────────────────────────────────────────────
  const totalStockValue = products.reduce((s, p) => s + Number(p.stock_value || (Number(p.current_stock || 0) * Number(p.per_unit_price || p.purchase_price || 0))), 0);
  const totalRetailValue = products.reduce((s, p) => s + (Number(p.current_stock || 0) * Number(p.sales_price || p.mrp_price || 0)), 0);
  const lowStockCount = products.filter(p => Number(p.current_stock || 0) <= Number(p.min_stock_level || 0) && Number(p.min_stock_level || 0) > 0).length;
  const outOfStockCount = products.filter(p => Number(p.current_stock || 0) === 0).length;
  const categorySummary = (() => {
    const map: Record<string, { count: number; value: number; quantity: number }> = {};
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!map[cat]) map[cat] = { count: 0, value: 0, quantity: 0 };
      map[cat].count++;
      map[cat].value += Number(p.stock_value || 0);
      map[cat].quantity += Number(p.current_stock || 0);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.value - a.value);
  })();

  // ── 7. Cash Flow ──────────────────────────────────────────────
  const cashInflows = periodCashTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const cashOutflows = periodCashTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netCashFlow = cashInflows - cashOutflows;
  const cashBalance = Number(businessData?.business?.total_cash_balance || 0);
  const bankBalance = Number(businessData?.business?.total_bank_balance || 0);
  const totalFunds = Number(businessData?.business?.total_funds || cashBalance + bankBalance);

  // ── 8. Top Customers ──────────────────────────────────────────
  const topCustomers = (() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    periodInvoices.forEach(inv => {
      const name = inv.customer_name || 'Walk-in';
      if (!map[name]) map[name] = { name, amount: 0, count: 0 };
      map[name].amount += Number(inv.total_amount || 0);
      map[name].count++;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 5);
  })();

  // ── Helpers ───────────────────────────────────────────────────
  const SectionHeader = ({ sKey, icon: Icon, title, subtitle, color }: { sKey: SectionKey; icon: any; title: string; subtitle: string; color: string }) => {
    const isExpanded = expandedSections.has(sKey);
    return (
      <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection(sKey)} activeOpacity={0.7}>
        <View style={[s.sectionIcon, { backgroundColor: color + '18' }]}>
          <Icon size={20} color={color} />
        </View>
        <View style={s.sectionInfo}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Text style={s.sectionSubtitle}>{subtitle}</Text>
        </View>
        {isExpanded ? <ChevronUp size={20} color={C.textLight} /> : <ChevronDown size={20} color={C.textLight} />}
      </TouchableOpacity>
    );
  };

  const StatRow = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <View style={s.statRow}>
      <Text style={[s.statLabel, bold && s.statLabelBold]}>{label}</Text>
      <Text style={[s.statValue, bold && s.statValueBold, color ? { color } : null]}>{value}</Text>
    </View>
  );

  const AgingBar = ({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) => {
    const width = total > 0 ? Math.max(4, (amount / total) * 100) : 0;
    return (
      <View style={s.agingRow}>
        <Text style={s.agingLabel}>{label}</Text>
        <View style={s.agingBarBg}>
          <View style={[s.agingBarFill, { width: `${width}%`, backgroundColor: color }]} />
        </View>
        <Text style={[s.agingAmount, { color }]}>{fmt(amount)}</Text>
      </View>
    );
  };

  const PaymentPill = ({ method, count, amount }: { method: string; count: number; amount: number }) => {
    const icons: Record<string, any> = { cash: Banknote, upi: Smartphone, card: CreditCard };
    const colors: Record<string, string> = { cash: C.success, upi: C.primary, card: C.warning };
    const Icon = icons[method] || Building2;
    const color = colors[method] || C.textLight;
    const name = method.charAt(0).toUpperCase() + method.slice(1);
    return (
      <View style={[s.payPill, { borderColor: color + '40' }]}>
        <View style={[s.payPillIcon, { backgroundColor: color + '15' }]}><Icon size={16} color={color} /></View>
        <View>
          <Text style={s.payPillName}>{name === 'Others' ? 'Other' : name}</Text>
          <Text style={s.payPillCount}>{count} txns</Text>
        </View>
        <Text style={[s.payPillAmt, { color }]}>{fmt(amount)}</Text>
      </View>
    );
  };

  const formatDateShort = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const expenseLabel = (cat: string) => {
    const labels: Record<string, string> = {
      rent: 'Rent', utilities: 'Utilities', salaries: 'Salaries', office_supplies: 'Office Supplies',
      marketing: 'Marketing', repairs: 'Repairs & Maintenance', insurance: 'Insurance', taxes: 'Taxes & Fees', other: 'Other',
    };
    return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Business Reports</Text>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <FileText size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.periodBar} contentContainerStyle={s.periodContent}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <TouchableOpacity key={p} style={[s.periodChip, period === p && s.periodChipActive]} onPress={() => setPeriod(p)} activeOpacity={0.7}>
            <Text style={[s.periodChipText, period === p && s.periodChipTextActive]}>{PERIOD_LABELS[p]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, padding: 16 }}><ListSkeleton /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* ── Quick KPIs ──────────────────────────────── */}
          <View style={s.kpiRow}>
            <View style={[s.kpiCard, { borderLeftColor: C.success }]}>
              <Text style={s.kpiLabel}>Net Sales</Text>
              <Text style={[s.kpiValue, { color: C.success }]}>{fmt(netSales)}</Text>
              <Text style={s.kpiSub}>{periodInvoices.length} invoices</Text>
            </View>
            <View style={[s.kpiCard, { borderLeftColor: C.primary }]}>
              <Text style={s.kpiLabel}>Net Profit</Text>
              <Text style={[s.kpiValue, { color: netProfit >= 0 ? C.success : C.error }]}>{fmt(netProfit)}</Text>
              <Text style={s.kpiSub}>{netMargin.toFixed(1)}% margin</Text>
            </View>
          </View>
          <View style={s.kpiRow}>
            <View style={[s.kpiCard, { borderLeftColor: C.warning }]}>
              <Text style={s.kpiLabel}>Receivables</Text>
              <Text style={[s.kpiValue, { color: C.warning }]}>{fmt(totalReceivable)}</Text>
              <Text style={s.kpiSub}>{receivablesData.length} customers</Text>
            </View>
            <View style={[s.kpiCard, { borderLeftColor: C.error }]}>
              <Text style={s.kpiLabel}>Payables</Text>
              <Text style={[s.kpiValue, { color: C.error }]}>{fmt(totalPayable)}</Text>
              <Text style={s.kpiSub}>{payablesData.length} suppliers</Text>
            </View>
          </View>

          {/* ═══ 1. SALES & REVENUE ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="sales" icon={ShoppingCart} title="Sales & Revenue" subtitle={`${fmt(netSales)} net · ${periodInvoices.length} invoices`} color={C.success} />
            {expandedSections.has('sales') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <StatRow label="Gross Sales" value={fmt(totalSalesGross)} color={C.success} />
                  <StatRow label="Returns" value={`- ${fmt(totalReturnsAmt)}`} color={C.error} />
                  <View style={s.divider} />
                  <StatRow label="Net Sales" value={fmt(netSales)} color={C.success} bold />
                  <StatRow label="Tax Collected" value={fmt(totalTaxCollected)} />
                  {totalCessCollected > 0 && <StatRow label="Cess Collected" value={fmt(totalCessCollected)} />}
                </View>

                <Text style={s.subHeading}>Payment Methods</Text>
                <View style={s.payPillGrid}>
                  {Object.entries(paymentMethodBreakdown).map(([m, d]) => (
                    <PaymentPill key={m} method={m} count={d.count} amount={d.amount} />
                  ))}
                  {Object.keys(paymentMethodBreakdown).length === 0 && <Text style={s.emptyText}>No sales in this period</Text>}
                </View>

                <Text style={s.subHeading}>Daily Trend (Recent)</Text>
                {dailySalesMap.map(([date, data]) => (
                  <View key={date} style={s.dailyRow}>
                    <Text style={s.dailyDate}>{formatDateShort(date)}</Text>
                    <View style={s.dailyBarContainer}>
                      <View style={[s.dailyBar, { width: `${pct(data.sales, totalSalesGross || 1)}%`, backgroundColor: C.success + '60' }]} />
                    </View>
                    <Text style={s.dailyAmt}>{fmt(data.sales - data.returns)}</Text>
                    <Text style={s.dailyCount}>{data.count}</Text>
                  </View>
                ))}
                {dailySalesMap.length === 0 && <Text style={s.emptyText}>No sales data</Text>}

                {topCustomers.length > 0 && (
                  <>
                    <Text style={s.subHeading}>Top Customers</Text>
                    {topCustomers.map((c, i) => (
                      <View key={c.name} style={s.rankRow}>
                        <Text style={s.rankNum}>#{i + 1}</Text>
                        <Text style={s.rankName} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.rankVal}>{fmt(c.amount)}</Text>
                        <Text style={s.rankSub}>{c.count} orders</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>

          {/* ═══ 2. GST SUMMARY ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="gst" icon={Receipt} title="GST Summary" subtitle={`${fmt(netGSTLiability)} net liability`} color={C.info} />
            {expandedSections.has('gst') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Output Tax (Sales)</Text>
                  <StatRow label="CGST (estimated)" value={fmt(cgst)} color={C.info} />
                  <StatRow label="SGST (estimated)" value={fmt(sgst)} color={C.info} />
                  <StatRow label="Total Output GST" value={fmt(outputGST)} color={C.info} bold />
                  {outputCess > 0 && <StatRow label="Cess" value={fmt(outputCess)} />}
                </View>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Input Tax Credit (Purchases)</Text>
                  <StatRow label="CGST ITC" value={fmt(inputCGST)} color={C.success} />
                  <StatRow label="SGST ITC" value={fmt(inputSGST)} color={C.success} />
                  <StatRow label="Total Input GST" value={fmt(inputGST)} color={C.success} bold />
                  {inputCess > 0 && <StatRow label="Cess ITC" value={fmt(inputCess)} />}
                </View>
                <View style={[s.card, { borderColor: netGSTLiability > 0 ? C.error + '40' : C.success + '40', borderWidth: 1.5 }]}>
                  <Text style={s.cardTitle}>Net GST Liability</Text>
                  <StatRow label="GST Payable" value={fmt(Math.max(0, netGSTLiability))} color={C.error} bold />
                  {netGSTLiability < 0 && <StatRow label="ITC Carry Forward" value={fmt(Math.abs(netGSTLiability))} color={C.success} />}
                  {(netCessLiability !== 0) && <StatRow label="Net Cess" value={fmt(netCessLiability)} />}
                </View>

                {hsnSummary.length > 0 && (
                  <>
                    <Text style={s.subHeading}>HSN-wise Summary</Text>
                    <View style={s.tableHeader}>
                      <Text style={[s.tableCell, { flex: 1.2 }]}>HSN</Text>
                      <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>Qty</Text>
                      <Text style={[s.tableCell, { flex: 1.5, textAlign: 'right' }]}>Taxable</Text>
                      <Text style={[s.tableCell, { flex: 1.2, textAlign: 'right' }]}>Tax</Text>
                    </View>
                    {hsnSummary.map(h => (
                      <View key={h.hsn} style={s.tableRow}>
                        <Text style={[s.tableCellVal, { flex: 1.2 }]}>{h.hsn}</Text>
                        <Text style={[s.tableCellVal, { flex: 1, textAlign: 'right' }]}>{fmtNum(h.quantity)}</Text>
                        <Text style={[s.tableCellVal, { flex: 1.5, textAlign: 'right' }]}>{fmt(h.taxableValue)}</Text>
                        <Text style={[s.tableCellVal, { flex: 1.2, textAlign: 'right' }]}>{fmt(h.taxAmount)}</Text>
                      </View>
                    ))}
                  </>
                )}

                <View style={s.noteBox}>
                  <AlertTriangle size={14} color={C.warning} />
                  <Text style={s.noteText}>CGST/SGST split is estimated (50/50). For inter-state sales (IGST), consult your CA. This is for reference only and not a substitute for GSTR filing.</Text>
                </View>
              </View>
            )}
          </View>

          {/* ═══ 3. PROFIT & LOSS ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="pnl" icon={TrendingUp} title="Profit & Loss" subtitle={`${fmt(netProfit)} net profit · ${netMargin.toFixed(1)}%`} color={netProfit >= 0 ? C.success : C.error} />
            {expandedSections.has('pnl') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Revenue</Text>
                  <StatRow label="Gross Sales" value={fmt(totalSalesGross)} />
                  <StatRow label="Less: Returns" value={`- ${fmt(totalReturnsAmt)}`} color={C.error} />
                  <View style={s.divider} />
                  <StatRow label="Net Revenue" value={fmt(revenue)} color={C.success} bold />
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>Cost of Goods Sold</Text>
                  <StatRow label="Purchases" value={fmt(purchaseTotal)} color={C.error} />
                  {writeOffTotal > 0 && <StatRow label="Write-offs / Shrinkage" value={fmt(writeOffTotal)} color={C.error} />}
                  {writeOffTotal > 0 && <StatRow label="Total COGS" value={fmt(cogs)} color={C.error} bold />}
                  <View style={s.divider} />
                  <StatRow label="Gross Profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? C.success : C.error} bold />
                  <StatRow label="Gross Margin" value={`${grossMargin.toFixed(1)}%`} />
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>Operating Expenses</Text>
                  {Object.entries(expenseBreakdown).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                    <StatRow key={cat} label={expenseLabel(cat)} value={fmt(amt)} />
                  ))}
                  {Object.keys(expenseBreakdown).length === 0 && <Text style={s.emptyText}>No expenses recorded</Text>}
                  <View style={s.divider} />
                  <StatRow label="Total Expenses" value={fmt(totalExpenses)} color={C.error} bold />
                </View>

                <View style={[s.card, { backgroundColor: netProfit >= 0 ? C.successBg : C.errorBg }]}>
                  <StatRow label="Net Profit / (Loss)" value={fmt(netProfit)} color={netProfit >= 0 ? C.success : C.error} bold />
                  <StatRow label="Net Margin" value={`${netMargin.toFixed(1)}%`} color={netProfit >= 0 ? C.success : C.error} />
                </View>
              </View>
            )}
          </View>

          {/* ═══ 4. RECEIVABLES ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="receivables" icon={ArrowDownRight} title="Receivables" subtitle={`${fmt(totalReceivable)} outstanding · ${fmt(overdueReceivable)} overdue`} color={C.warning} />
            {expandedSections.has('receivables') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <StatRow label="Total Outstanding" value={fmt(totalReceivable)} color={C.warning} bold />
                  <StatRow label="Overdue Amount" value={fmt(overdueReceivable)} color={C.error} />
                  <StatRow label="Customers" value={String(receivablesData.length)} />
                </View>

                <Text style={s.subHeading}>Aging Analysis</Text>
                <View style={s.card}>
                  <AgingBar label="Current" amount={receivableAging.current} total={totalReceivable} color={C.success} />
                  <AgingBar label="1-30 days" amount={receivableAging['1_30']} total={totalReceivable} color={C.warning} />
                  <AgingBar label="31-60 days" amount={receivableAging['31_60']} total={totalReceivable} color="#F97316" />
                  <AgingBar label="61-90 days" amount={receivableAging['61_90']} total={totalReceivable} color={C.error} />
                  <AgingBar label="90+ days" amount={receivableAging['90_plus']} total={totalReceivable} color="#991B1B" />
                </View>

                {receivablesData.length > 0 && (
                  <>
                    <Text style={s.subHeading}>Top Outstanding</Text>
                    {receivablesData.sort((a, b) => Number(b.totalReceivable || 0) - Number(a.totalReceivable || 0)).slice(0, 5).map((r, i) => (
                      <View key={r.id || i} style={s.rankRow}>
                        <Text style={s.rankNum}>#{i + 1}</Text>
                        <Text style={s.rankName} numberOfLines={1}>{r.customerName}</Text>
                        <Text style={[s.rankVal, { color: C.warning }]}>{fmt(r.totalReceivable)}</Text>
                        <Text style={s.rankSub}>{r.invoiceCount} inv</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>

          {/* ═══ 5. PAYABLES ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="payables" icon={ArrowUpRight} title="Payables" subtitle={`${fmt(totalPayable)} outstanding · ${fmt(overduePayable)} overdue`} color={C.error} />
            {expandedSections.has('payables') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <StatRow label="Total Outstanding" value={fmt(totalPayable)} color={C.error} bold />
                  <StatRow label="Overdue Amount" value={fmt(overduePayable)} color={C.error} />
                  <StatRow label="Suppliers" value={String(payablesData.length)} />
                </View>

                <Text style={s.subHeading}>Aging Analysis</Text>
                <View style={s.card}>
                  <AgingBar label="Current" amount={payableAging.current} total={totalPayable} color={C.success} />
                  <AgingBar label="1-30 days" amount={payableAging['1_30']} total={totalPayable} color={C.warning} />
                  <AgingBar label="31-60 days" amount={payableAging['31_60']} total={totalPayable} color="#F97316" />
                  <AgingBar label="61-90 days" amount={payableAging['61_90']} total={totalPayable} color={C.error} />
                  <AgingBar label="90+ days" amount={payableAging['90_plus']} total={totalPayable} color="#991B1B" />
                </View>

                {payablesData.length > 0 && (
                  <>
                    <Text style={s.subHeading}>Top Outstanding</Text>
                    {payablesData.sort((a, b) => Number(b.totalPayable || 0) - Number(a.totalPayable || 0)).slice(0, 5).map((p, i) => (
                      <View key={p.id || i} style={s.rankRow}>
                        <Text style={s.rankNum}>#{i + 1}</Text>
                        <Text style={s.rankName} numberOfLines={1}>{p.supplierName}</Text>
                        <Text style={[s.rankVal, { color: C.error }]}>{fmt(p.totalPayable)}</Text>
                        <Text style={s.rankSub}>{p.billCount} bills</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>

          {/* ═══ 6. INVENTORY ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="inventory" icon={Package} title="Inventory Valuation" subtitle={`${fmt(totalStockValue)} cost · ${products.length} products`} color={C.primary} />
            {expandedSections.has('inventory') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <StatRow label="Total Stock (Cost)" value={fmt(totalStockValue)} color={C.primary} bold />
                  <StatRow label="Total Stock (Retail)" value={fmt(totalRetailValue)} color={C.success} />
                  <StatRow label="Potential Margin" value={fmt(totalRetailValue - totalStockValue)} color={C.success} />
                  <View style={s.divider} />
                  <StatRow label="Total Products" value={String(products.length)} />
                  <StatRow label="Low Stock" value={String(lowStockCount)} color={lowStockCount > 0 ? C.warning : C.textLight} />
                  <StatRow label="Out of Stock" value={String(outOfStockCount)} color={outOfStockCount > 0 ? C.error : C.textLight} />
                  {writeOffTotal > 0 && <StatRow label={`Write-offs (${PERIOD_LABELS[period]})`} value={fmt(writeOffTotal)} color={C.error} />}
                </View>

                {categorySummary.length > 0 && (
                  <>
                    <Text style={s.subHeading}>Category Breakdown</Text>
                    {categorySummary.slice(0, 8).map(([cat, data]) => (
                      <View key={cat} style={s.catRow}>
                        <View style={s.catDot} />
                        <Text style={s.catName} numberOfLines={1}>{cat}</Text>
                        <Text style={s.catCount}>{data.count} items</Text>
                        <Text style={s.catVal}>{fmt(data.value)}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>

          {/* ═══ 7. EXPENSE ANALYSIS ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="expenses" icon={PieChart} title="Expense Analysis" subtitle={`${fmt(totalExpenses)} total expenses`} color="#7C3AED" />
            {expandedSections.has('expenses') && (
              <View style={s.sectionBody}>
                {Object.keys(expenseBreakdown).length > 0 ? (
                  <>
                    <View style={s.card}>
                      <StatRow label="Total Expenses" value={fmt(totalExpenses)} color={C.error} bold />
                      <StatRow label="Expense to Revenue" value={`${pct(totalExpenses, revenue)}%`} />
                    </View>
                    <Text style={s.subHeading}>By Category</Text>
                    {Object.entries(expenseBreakdown).sort(([, a], [, b]) => b - a).map(([cat, amt]) => {
                      const percentage = pct(amt, totalExpenses);
                      return (
                        <View key={cat} style={s.expRow}>
                          <View style={s.expInfo}>
                            <Text style={s.expName}>{expenseLabel(cat)}</Text>
                            <Text style={s.expPct}>{percentage}%</Text>
                          </View>
                          <View style={s.expBarBg}>
                            <View style={[s.expBarFill, { width: `${percentage}%` }]} />
                          </View>
                          <Text style={s.expAmt}>{fmt(amt)}</Text>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={s.card}><Text style={s.emptyText}>No expenses recorded for this period</Text></View>
                )}
              </View>
            )}
          </View>

          {/* ═══ 8. CASH FLOW ═══ */}
          <View style={s.section}>
            <SectionHeader sKey="cashflow" icon={Wallet} title="Cash Flow & Funds" subtitle={`${fmt(totalFunds)} total funds`} color="#0891B2" />
            {expandedSections.has('cashflow') && (
              <View style={s.sectionBody}>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Current Position</Text>
                  <StatRow label="Cash Balance" value={fmt(cashBalance)} />
                  <StatRow label="Bank Balance" value={fmt(bankBalance)} />
                  <View style={s.divider} />
                  <StatRow label="Total Funds" value={fmt(totalFunds)} color={C.primary} bold />
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>{`Cash Flow (${PERIOD_LABELS[period]})`}</Text>
                  <View style={s.cfRow}>
                    <View style={[s.cfCard, { backgroundColor: C.successBg }]}>
                      <ArrowDownRight size={18} color={C.success} />
                      <Text style={s.cfLabel}>Inflows</Text>
                      <Text style={[s.cfValue, { color: C.success }]}>{fmt(cashInflows)}</Text>
                    </View>
                    <View style={[s.cfCard, { backgroundColor: C.errorBg }]}>
                      <ArrowUpRight size={18} color={C.error} />
                      <Text style={s.cfLabel}>Outflows</Text>
                      <Text style={[s.cfValue, { color: C.error }]}>{fmt(cashOutflows)}</Text>
                    </View>
                  </View>
                  <View style={s.divider} />
                  <StatRow label="Net Cash Flow" value={fmt(netCashFlow)} color={netCashFlow >= 0 ? C.success : C.error} bold />
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>Working Capital</Text>
                  <StatRow label="Receivables" value={fmt(totalReceivable)} color={C.warning} />
                  <StatRow label="Less: Payables" value={`- ${fmt(totalPayable)}`} color={C.error} />
                  <View style={s.divider} />
                  <StatRow label="Net Working Capital" value={fmt(totalReceivable - totalPayable)} color={totalReceivable >= totalPayable ? C.success : C.error} bold />
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: `Business Report - ${PERIOD_LABELS[period]}`,
          fileName: 'business_report',
          columns: [
            { key: 'section', header: 'Section' },
            { key: 'metric', header: 'Metric' },
            { key: 'value', header: 'Value' },
          ],
          data: [
            { section: 'Sales Summary', metric: 'Gross Sales', value: fmt(totalSalesGross) },
            { section: 'Sales Summary', metric: 'Returns', value: fmt(totalReturnsAmt) },
            { section: 'Sales Summary', metric: 'Net Sales', value: fmt(netSales) },
            { section: 'Sales Summary', metric: 'Invoices', value: String(periodInvoices.length) },
            { section: 'Sales Summary', metric: 'Average Invoice', value: fmt(periodInvoices.length > 0 ? netSales / periodInvoices.length : 0) },
            { section: 'GST Summary', metric: 'Output GST (Collected)', value: fmt(outputGST) },
            { section: 'GST Summary', metric: 'Input GST (Paid)', value: fmt(inputGST) },
            { section: 'GST Summary', metric: 'Net GST Liability', value: fmt(outputGST - inputGST) },
            { section: 'Profit & Loss', metric: 'Revenue', value: fmt(revenue) },
            { section: 'Profit & Loss', metric: 'Purchase Cost', value: fmt(purchaseTotal) },
            { section: 'Profit & Loss', metric: 'Write-off Cost', value: fmt(writeOffTotal) },
            { section: 'Profit & Loss', metric: 'COGS', value: fmt(cogs) },
            { section: 'Profit & Loss', metric: 'Gross Profit', value: fmt(grossProfit) },
            { section: 'Profit & Loss', metric: 'Total Expenses', value: fmt(totalExpenses) },
            { section: 'Profit & Loss', metric: 'Net Profit', value: fmt(netProfit) },
            { section: 'Receivables', metric: 'Total Receivable', value: fmt(totalReceivable) },
            { section: 'Receivables', metric: 'Overdue', value: fmt(overdueReceivable) },
            { section: 'Payables', metric: 'Total Payable', value: fmt(totalPayable) },
            { section: 'Payables', metric: 'Overdue', value: fmt(overduePayable) },
            { section: 'Inventory', metric: 'Total Stock Value', value: fmt(totalStockValue) },
            { section: 'Inventory', metric: 'Total Products', value: String(products.length) },
            { section: 'Inventory', metric: 'Low Stock Items', value: String(lowStockCount) },
            { section: 'Cash Flow', metric: 'Total Inflows', value: fmt(cashInflows) },
            { section: 'Cash Flow', metric: 'Total Outflows', value: fmt(cashOutflows) },
            { section: 'Cash Flow', metric: 'Net Cash Flow', value: fmt(netCashFlow) },
            { section: 'Cash Flow', metric: 'Total Funds', value: fmt(totalFunds) },
          ],
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },

  periodBar: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 52 },
  periodContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  periodChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodChipText: { fontSize: 13, fontWeight: '500', color: C.textLight },
  periodChipTextActive: { color: C.bg },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiLabel: { fontSize: 12, color: C.textLight, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700' },
  kpiSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  section: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionInfo: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  sectionSubtitle: { fontSize: 12, color: C.textLight, marginTop: 2 },
  sectionBody: { borderTopWidth: 1, borderTopColor: C.border, padding: 16, backgroundColor: C.surface, gap: 12 },

  card: { backgroundColor: C.bg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 10 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  statLabel: { fontSize: 13, color: C.textLight },
  statLabelBold: { fontWeight: '600', color: C.text },
  statValue: { fontSize: 13, fontWeight: '500', color: C.text },
  statValueBold: { fontSize: 15, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },

  subHeading: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 4 },

  payPillGrid: { gap: 8 },
  payPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 12, borderWidth: 1 },
  payPillIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  payPillName: { fontSize: 14, fontWeight: '600', color: C.text },
  payPillCount: { fontSize: 11, color: C.textMuted },
  payPillAmt: { marginLeft: 'auto', fontSize: 15, fontWeight: '700' },

  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  dailyDate: { width: 55, fontSize: 12, color: C.textLight },
  dailyBarContainer: { flex: 1, height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  dailyBar: { height: '100%', borderRadius: 4 },
  dailyAmt: { width: 72, fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'right' },
  dailyCount: { width: 24, fontSize: 11, color: C.textMuted, textAlign: 'right' },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rankNum: { width: 28, fontSize: 13, fontWeight: '700', color: C.primary },
  rankName: { flex: 1, fontSize: 13, color: C.text },
  rankVal: { fontSize: 13, fontWeight: '700', color: C.success },
  rankSub: { width: 60, fontSize: 11, color: C.textMuted, textAlign: 'right' },

  agingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  agingLabel: { width: 70, fontSize: 12, color: C.textLight },
  agingBarBg: { flex: 1, height: 10, backgroundColor: C.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
  agingBarFill: { height: '100%', borderRadius: 5 },
  agingAmount: { width: 80, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: C.warningBg, borderRadius: 8, padding: 12, marginTop: 4, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 11, color: C.warning, lineHeight: 16 },

  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tableCell: { fontSize: 11, fontWeight: '600', color: C.textLight, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tableCellVal: { fontSize: 12, color: C.text },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  catName: { flex: 1, fontSize: 13, color: C.text },
  catCount: { fontSize: 11, color: C.textMuted, width: 60 },
  catVal: { fontSize: 13, fontWeight: '600', color: C.primary, width: 80, textAlign: 'right' },

  expRow: { marginBottom: 14 },
  expInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  expName: { fontSize: 13, color: C.text },
  expPct: { fontSize: 12, color: C.textMuted },
  expBarBg: { height: 6, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  expBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#7C3AED' },
  expAmt: { fontSize: 13, fontWeight: '600', color: C.text },

  cfRow: { flexDirection: 'row', gap: 10 },
  cfCard: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  cfLabel: { fontSize: 12, color: C.textLight },
  cfValue: { fontSize: 17, fontWeight: '700' },

  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
});
