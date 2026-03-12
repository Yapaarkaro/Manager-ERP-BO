import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  useWindowDimensions,
  AppState,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Shield,
  Building2,
  Users,
  FileText,
  Smartphone,
  ClipboardList,
  LogOut,
  RefreshCw,
  TrendingUp,
  Activity,
  CreditCard,
  Package,
  ShoppingCart,
  MapPin,
  UserCheck,
  IndianRupee,
  AlertTriangle,
  Menu,
  X,
  Clock,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Wallet,
  Megaphone,
} from 'lucide-react-native';
import { verifySuperadmin, getOverview, getAllMarketingRequests, updateMarketingRequestStatus } from '@/services/superadminApi';
import { supabase } from '@/lib/supabase';
import { safeRouter } from '@/utils/safeRouter';

// ─── COLORS ─────────────────────────────────
const C = {
  primary: '#3F66AC',
  primaryLight: '#5A82C4',
  primaryDark: '#2E4F8A',
  primaryBg: '#EBF0F8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  accent: '#8B5CF6',
  accentBg: '#F5F3FF',
  orange: '#F97316',
  orangeBg: '#FFF7ED',
  teal: '#14B8A6',
  tealBg: '#F0FDFA',
};

type TabId = 'overview' | 'businesses' | 'users' | 'activity' | 'audit' | 'devices';
type ViewMode = 'platform' | 'business';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'businesses', label: 'Businesses', icon: Building2 },
  { id: 'users', label: 'Users & Staff', icon: Users },
  { id: 'activity', label: 'Activity', icon: Clock },
  { id: 'audit', label: 'Audit Trail', icon: FileText },
  { id: 'devices', label: 'Devices', icon: Smartphone },
];

const PAGE_SIZE = 30;

// ─── HELPERS ────────────────────────────────
const fmt = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
};

const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

const fmtDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ─── BUSINESS METRIC TYPES ─────────────────
type BizMetricKey = 'totalRevenue' | 'todayRevenue' | 'todayInvoices' | 'bankBalances' | 'cashBalances' | 'receivables' | 'payables' | 'lowStock';

interface BizMetricItem {
  business: any;
  value: number;
  displayValue: string;
  details: any[];
}

// ─── STANDALONE SEARCHBAR (outside component to prevent remount on every render) ──
const DashboardSearchBar = React.memo(({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) => (
  <View style={sbStyles.container}>
    <Search size={16} color={C.textMuted} />
    <TextInput
      style={sbStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={16} color={C.textMuted} />
      </TouchableOpacity>
    )}
  </View>
));

const sbStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 4, gap: 8, marginBottom: 12 },
  input: { flex: 1, fontSize: 14, color: C.text, paddingVertical: Platform.OS === 'ios' ? 0 : 6, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
});

// ─── MAIN COMPONENT ────────────────────────
export default function SuperadminDashboard() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const colCount = isDesktop ? 4 : isTablet ? 3 : 2;

  const [verified, setVerified] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('platform');

  // Drill-down for business ranking
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingMetric, setRankingMetric] = useState<BizMetricKey | null>(null);
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingSelectedBiz, setRankingSelectedBiz] = useState<string | null>(null);

  // Platform drill-down (simple)
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState('');
  const [drillItems, setDrillItems] = useState<any[]>([]);
  const [drillType, setDrillType] = useState<string>('');

  // Section-level state
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [bizSearch, setBizSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [marketingRequests, setMarketingRequests] = useState<any[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [devicePage, setDevicePage] = useState(1);

  const appStateRef = useRef(AppState.currentState);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []));

  useEffect(() => { (async () => { const ok = await verifySuperadmin(); setVerified(ok); if (ok) loadData(); })(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current === 'active' && (next === 'background' || next === 'inactive')) {
        supabase.auth.signOut().catch(() => {});
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, mr] = await Promise.all([getOverview(), getAllMarketingRequests()]);
      if (r?.success) setData(r);
      if (mr?.success && mr.requests) setMarketingRequests(mr.requests);
    }
    catch (e: any) { console.error('SA load:', e.message); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // ─── DERIVED DATA ─────────────────────────
  const st = data?.stats || {};
  const businesses: any[] = data?.businesses || [];
  const activeBiz = useMemo(() => businesses.filter((b: any) => !b.is_deleted), [businesses]);

  const getBizName = (bizId: string) => {
    const b = businesses.find((x: any) => x.id === bizId);
    return b?.legal_name || b?.owner_name || '—';
  };

  const getSubBadge = (b: any) => {
    if (b.subscription_status === 'active' || b.subscription_status === 'subscribed')
      return { label: 'Subscribed', color: C.success, bg: C.successBg };
    if (b.is_on_trial) {
      const d = b.trial_end_date ? daysUntil(b.trial_end_date) : 0;
      if (d <= 0) return { label: 'Trial Expired', color: C.error, bg: C.errorBg };
      if (d <= 7) return { label: `${d}d left`, color: C.warning, bg: C.warningBg };
      return { label: `${d}d left`, color: C.info, bg: C.infoBg };
    }
    if (b.subscription_status === 'cancelled') return { label: 'Cancelled', color: C.error, bg: C.errorBg };
    return { label: b.subscription_status || '—', color: C.textMuted, bg: C.bg };
  };

  const taxLabel = (b: any) => {
    if (b.tax_id_type === 'GSTIN') return `GSTIN: ${b.tax_id}`;
    if (b.tax_id_type === 'PAN') return `PAN: ${b.tax_id}`;
    return b.tax_id ? `Tax: ${b.tax_id}` : '—';
  };

  // ─── BUSINESS METRIC COMPUTATION ──────────
  const todayISO = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.toISOString(); }, []);

  const computeBizMetrics = useCallback((metric: BizMetricKey): BizMetricItem[] => {
    const invoices: any[] = data?.invoices || [];
    const bankAccounts: any[] = data?.bankAccounts || [];
    const customers: any[] = data?.customers || [];
    const suppliers: any[] = data?.suppliers || [];
    const products: any[] = data?.products || [];

    return activeBiz.map(biz => {
      const bizInvoices = invoices.filter(i => i.business_id === biz.id && !i.is_deleted);
      const bizBanks = bankAccounts.filter(ba => ba.business_id === biz.id && !ba.is_deleted);
      const bizCustomers = customers.filter(c => c.business_id === biz.id && !c.is_deleted);
      const bizSuppliers = suppliers.filter(s => s.business_id === biz.id && !s.is_deleted);
      const bizProducts = products.filter(p => p.business_id === biz.id && !p.is_deleted);

      let value = 0;
      let displayValue = '';
      let details: any[] = [];

      switch (metric) {
        case 'totalRevenue':
          value = bizInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          displayValue = fmt(value);
          details = bizInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'todayRevenue': {
          const todayInvs = bizInvoices.filter(i => i.created_at >= todayISO);
          value = todayInvs.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          displayValue = fmt(value);
          details = todayInvs;
          break;
        }
        case 'todayInvoices': {
          const todayInvs = bizInvoices.filter(i => i.created_at >= todayISO);
          value = todayInvs.length;
          displayValue = String(value);
          details = todayInvs;
          break;
        }
        case 'bankBalances':
          value = bizBanks.reduce((sum, ba) => sum + (Number(ba.current_balance) || 0), 0);
          displayValue = fmt(value);
          details = bizBanks;
          break;
        case 'cashBalances': {
          const cashBal = Number(biz.total_cash_balance) || 0;
          value = cashBal;
          displayValue = fmt(value);
          details = [{ id: `cash-${biz.id}`, type: 'cash_balance', label: 'Cash Balance', initial_balance: Number(biz.initial_cash_balance) || 0, current_balance: cashBal }];
          break;
        }
        case 'receivables':
          value = bizCustomers.reduce((sum, c) => sum + (Number(c.outstanding_balance) || 0), 0);
          displayValue = fmt(value);
          details = bizCustomers.filter(c => Number(c.outstanding_balance) > 0);
          break;
        case 'payables':
          value = bizSuppliers.reduce((sum, s) => sum + (Number(s.outstanding_balance) || 0), 0);
          displayValue = fmt(value);
          details = bizSuppliers.filter(s => Number(s.outstanding_balance) > 0);
          break;
        case 'lowStock': {
          const lowItems = bizProducts.filter(p => p.current_stock !== null && p.min_stock_level !== null && p.current_stock <= p.min_stock_level);
          value = lowItems.length;
          displayValue = String(value);
          details = lowItems;
          break;
        }
      }
      return { business: biz, value, displayValue, details };
    }).sort((a, b) => b.value - a.value);
  }, [data, activeBiz, todayISO]);

  const rankingData = useMemo(() => {
    if (!rankingMetric) return [];
    return computeBizMetrics(rankingMetric);
  }, [rankingMetric, computeBizMetrics]);

  const auditActionCounts = useMemo(() => {
    const audits: any[] = data?.auditLogs || [];
    const counts: Record<string, number> = {};
    audits.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return counts;
  }, [data?.auditLogs]);

  const filteredRankingData = useMemo(() => {
    if (!rankingSearch.trim()) return rankingData;
    const q = rankingSearch.toLowerCase();
    return rankingData.filter(r =>
      (r.business.legal_name || '').toLowerCase().includes(q) ||
      (r.business.owner_name || '').toLowerCase().includes(q) ||
      (r.business.tax_id || '').toLowerCase().includes(q) ||
      (r.business.phone || '').includes(q) ||
      (r.business.business_type || '').toLowerCase().includes(q)
    );
  }, [rankingData, rankingSearch]);

  const totalCashBalance = useMemo(() => activeBiz.reduce((sum, b) => sum + (Number(b.total_cash_balance) || 0), 0), [activeBiz]);

  const filteredBiz = useMemo(() => {
    if (!bizSearch.trim()) return businesses;
    const q = bizSearch.toLowerCase();
    const locations: any[] = data?.locations || [];
    return businesses.filter((b: any) => {
      if (
        (b.legal_name || '').toLowerCase().includes(q) ||
        (b.owner_name || '').toLowerCase().includes(q) ||
        (b.tax_id || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q) ||
        (b.business_type || '').toLowerCase().includes(q)
      ) return true;
      const bizLocs = locations.filter((l: any) => l.business_id === b.id && !l.is_deleted);
      return bizLocs.some((l: any) =>
        (l.city || '').toLowerCase().includes(q) ||
        (l.state || '').toLowerCase().includes(q) ||
        (l.pincode || '').includes(q) ||
        (l.address_line1 || '').toLowerCase().includes(q) ||
        (l.name || '').toLowerCase().includes(q)
      );
    });
  }, [businesses, bizSearch, data?.locations]);

  const metricLabels: Record<BizMetricKey, string> = {
    totalRevenue: 'Total Revenue',
    todayRevenue: "Today's Revenue",
    todayInvoices: "Today's Invoices",
    bankBalances: 'Bank Balances',
    cashBalances: 'Cash Balances',
    receivables: 'Receivables',
    payables: 'Payables',
    lowStock: 'Low Stock Items',
  };

  // ─── PLATFORM DRILL-DOWN ──────────────────
  const openPlatformDrill = (key: string) => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    const signups: any[] = data?.signupProgress || [];
    const subs: any[] = data?.subscriptions || [];

    let title = '';
    let items: any[] = [];
    let type = 'business';

    switch (key) {
      case 'activeBusinesses': title = 'Active Businesses'; items = activeBiz; break;
      case 'activeTrials': title = 'Active Trials'; items = activeBiz.filter(b => b.is_on_trial && b.trial_end_date && new Date(b.trial_end_date) > now); break;
      case 'subscribedBusinesses': title = 'Subscribed'; items = activeBiz.filter(b => b.subscription_status === 'active' || b.subscription_status === 'subscribed'); break;
      case 'trialExpiringThisWeek': title = 'Expiring This Week'; items = activeBiz.filter(b => b.is_on_trial && b.trial_end_date && new Date(b.trial_end_date) > now && new Date(b.trial_end_date) <= week); break;
      case 'expiredTrials': title = 'Expired Trials'; items = activeBiz.filter(b => b.is_on_trial && b.trial_end_date && new Date(b.trial_end_date) <= now); break;
      case 'cancelledSubscriptions': title = 'Cancelled'; type = 'subscription'; items = subs.filter(s2 => s2.status === 'cancelled' || s2.cancel_at_period_end); break;
      case 'estimatedMRR': title = 'MRR Breakdown'; type = 'info'; items = [{ label: 'Subscribed', value: st.subscribedBusinesses || 0 }, { label: 'Monthly Price', value: fmt(st.monthlyPlanPrice || 750) }, { label: 'Yearly Price', value: fmt(st.yearlyPlanPrice || 7500) }, { label: 'Est. MRR', value: fmt(st.estimatedMRR || 0) }]; break;
      case 'onboardedBusinesses': title = 'Onboarded'; items = activeBiz.filter(b => b.is_onboarding_complete); break;
      case 'pendingOnboarding': title = 'Pending Onboarding'; items = activeBiz.filter(b => !b.is_onboarding_complete); break;
      case 'totalSignups': title = 'All Signups'; type = 'signup'; items = signups; break;
      case 'todaySignups': title = "Today's Signups"; type = 'signup'; items = signups.filter(s2 => s2.created_at >= todayISO); break;
      case 'completedSignups': title = 'Completed Signups'; type = 'signup'; items = signups.filter(s2 => ['signupComplete', 'completed', 'complete'].includes(s2.current_step)); break;
      case 'pendingSignups': title = 'In-Progress'; type = 'signup'; items = signups.filter(s2 => !['signupComplete', 'completed', 'complete'].includes(s2.current_step)); break;
      default: return;
    }
    setDrillTitle(title); setDrillItems(items); setDrillType(type); setDrillOpen(true);
  };

  const openBizRanking = (metric: BizMetricKey) => {
    setRankingMetric(metric);
    setRankingSearch('');
    setRankingSelectedBiz(null);
    setRankingOpen(true);
  };

  // ─── REUSABLE COMPONENTS ──────────────────
  const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
    <View style={[s.badge, { backgroundColor: bg }]}><Text style={[s.badgeText, { color }]}>{label}</Text></View>
  );

  const ViewToggle = () => (
    <View style={s.toggle}>
      <TouchableOpacity style={[s.toggleBtn, viewMode === 'platform' && s.toggleBtnActive]} onPress={() => setViewMode('platform')} activeOpacity={0.7}>
        <Shield size={13} color={viewMode === 'platform' ? '#FFF' : C.textMuted} />
        <Text style={[s.toggleText, viewMode === 'platform' && s.toggleTextActive]}>Platform</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.toggleBtn, viewMode === 'business' && s.toggleBtnActive]} onPress={() => setViewMode('business')} activeOpacity={0.7}>
        <Building2 size={13} color={viewMode === 'business' ? '#FFF' : C.textMuted} />
        <Text style={[s.toggleText, viewMode === 'business' && s.toggleTextActive]}>Business Network</Text>
      </TouchableOpacity>
    </View>
  );

  const Stat = ({ title, value, icon: Icon, color, bg, onPress }: { title: string; value: string | number; icon: any; color: string; bg: string; onPress?: () => void }) => (
    <TouchableOpacity
      style={[s.stat, { width: `${100 / colCount - 2}%` as any }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={s.statTop}>
        <View style={[s.statIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View>
        {onPress && <ChevronRight size={14} color={C.textMuted} />}
      </View>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{title}</Text>
    </TouchableOpacity>
  );

  const SecTitle = ({ title }: { title: string }) => (
    <View style={s.secDivider}>
      <View style={s.secDividerLine} />
      <Text style={s.secDividerText}>{title}</Text>
      <View style={s.secDividerLine} />
    </View>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <View style={s.emptyState}><Text style={s.emptyText}>{message}</Text></View>
  );

  // ─── LOADING / DENIED ─────────────────────
  if (verified === null) return (
    <SafeAreaView style={s.center} edges={['top', 'bottom', 'left', 'right']}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={s.loadingText}>Verifying superadmin access...</Text>
    </SafeAreaView>
  );
  if (!verified) return (
    <SafeAreaView style={s.center} edges={['top', 'bottom', 'left', 'right']}>
      <Shield size={56} color={C.error} />
      <Text style={s.deniedTitle}>Access Denied</Text>
      <Text style={s.deniedSub}>You do not have superadmin privileges.</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => safeRouter.replace('/auth/mobile')}><Text style={s.backBtnText}>Go to Login</Text></TouchableOpacity>
    </SafeAreaView>
  );

  // ─── SIDEBAR ──────────────────────────────
  const renderSidebar = () => (
    <View style={[s.sidebar, isDesktop && s.sidebarDesktop]}>
      <View style={s.sidebarHead}>
        <View style={s.sidebarLogo}><Shield size={20} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.sidebarBrand}>Manager ERP</Text>
          <Text style={s.sidebarRole}>Super Admin</Text>
        </View>
        {!isDesktop && <TouchableOpacity onPress={() => setSidebarOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><X size={20} color={C.textMuted} /></TouchableOpacity>}
      </View>
      {TABS.map(t => {
        const Icon = t.icon; const active = activeTab === t.id;
        return (
          <TouchableOpacity key={t.id} style={[s.sidebarItem, active && s.sidebarItemActive]} onPress={() => { setActiveTab(t.id); if (!isDesktop) setSidebarOpen(false); }} activeOpacity={0.7}>
            <Icon size={18} color={active ? C.primary : C.textMuted} />
            <Text style={[s.sidebarItemText, active && s.sidebarItemTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
      <View style={s.sidebarFooter}>
        <TouchableOpacity style={s.sidebarItem} onPress={() => { supabase.auth.signOut().then(() => safeRouter.replace('/auth/mobile')); }} activeOpacity={0.7}>
          <LogOut size={18} color={C.textMuted} />
          <Text style={s.sidebarItemText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── OVERVIEW TAB ─────────────────────────
  const renderOverview = () => (
    <View>
      <ViewToggle />
      {viewMode === 'platform' ? (
        <>
          <SecTitle title="PLATFORM HEALTH" />
          <View style={s.statsGrid}>
            <Stat title="Total Businesses" value={st.activeBusinesses || 0} icon={Building2} color={C.primary} bg={C.primaryBg} onPress={() => openPlatformDrill('activeBusinesses')} />
            <Stat title="Active Trials" value={st.activeTrials || 0} icon={Clock} color={C.info} bg={C.infoBg} onPress={() => openPlatformDrill('activeTrials')} />
            <Stat title="Subscribed" value={st.subscribedBusinesses || 0} icon={CheckCircle} color={C.success} bg={C.successBg} onPress={() => openPlatformDrill('subscribedBusinesses')} />
            <Stat title="Trials Expiring (7d)" value={st.trialExpiringThisWeek || 0} icon={AlertTriangle} color={C.warning} bg={C.warningBg} onPress={() => openPlatformDrill('trialExpiringThisWeek')} />
            <Stat title="Expired Trials" value={st.expiredTrials || 0} icon={XCircle} color={C.error} bg={C.errorBg} onPress={() => openPlatformDrill('expiredTrials')} />
            <Stat title="Cancelled" value={st.cancelledSubscriptions || 0} icon={XCircle} color={C.textMuted} bg={C.bg} onPress={() => openPlatformDrill('cancelledSubscriptions')} />
            <Stat title="Est. MRR" value={fmt(st.estimatedMRR || 0)} icon={TrendingUp} color={C.success} bg={C.successBg} onPress={() => openPlatformDrill('estimatedMRR')} />
            <Stat title="Onboarded" value={st.onboardedBusinesses || 0} icon={UserCheck} color={C.teal} bg={C.tealBg} onPress={() => openPlatformDrill('onboardedBusinesses')} />
          </View>

          <SecTitle title="SIGNUP FUNNEL" />
          <View style={s.statsGrid}>
            <Stat title="Total Signups" value={st.totalSignups || 0} icon={ClipboardList} color={C.primary} bg={C.primaryBg} onPress={() => openPlatformDrill('totalSignups')} />
            <Stat title="Today's Signups" value={st.todaySignups || 0} icon={Zap} color={C.accent} bg={C.accentBg} onPress={() => openPlatformDrill('todaySignups')} />
            <Stat title="Completed" value={st.completedSignups || 0} icon={CheckCircle} color={C.success} bg={C.successBg} onPress={() => openPlatformDrill('completedSignups')} />
            <Stat title="In Progress" value={st.pendingSignups || 0} icon={Clock} color={C.warning} bg={C.warningBg} onPress={() => openPlatformDrill('pendingSignups')} />
            <Stat title="Pending Onboard" value={st.pendingOnboarding || 0} icon={AlertTriangle} color={C.orange} bg={C.orangeBg} onPress={() => openPlatformDrill('pendingOnboarding')} />
          </View>

          {st.subscriptionsByStatus && Object.keys(st.subscriptionsByStatus).length > 0 && (
            <>
              <SecTitle title="SUBSCRIPTIONS BY STATUS" />
              <View style={s.card}>
                {Object.entries(st.subscriptionsByStatus).map(([status, count]: [string, any]) => (
                  <View key={status} style={s.row}><Text style={s.rowLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text><Text style={s.rowValue}>{count}</Text></View>
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <SecTitle title="BUSINESS NETWORK FINANCIALS" />
          <View style={s.statsGrid}>
            <Stat title="Total Revenue" value={fmt(st.totalRevenue || 0)} icon={TrendingUp} color={C.success} bg={C.successBg} onPress={() => openBizRanking('totalRevenue')} />
            <Stat title="Today's Revenue" value={fmt(st.todayRevenue || 0)} icon={IndianRupee} color={C.info} bg={C.infoBg} onPress={() => openBizRanking('todayRevenue')} />
            <Stat title="Today's Invoices" value={st.todayInvoiceCount || 0} icon={FileText} color={C.accent} bg={C.accentBg} onPress={() => openBizRanking('todayInvoices')} />
            <Stat title="Bank Balances" value={fmt(st.totalBankBalance || 0)} icon={CreditCard} color={C.teal} bg={C.tealBg} onPress={() => openBizRanking('bankBalances')} />
            <Stat title="Cash Balances" value={fmt(totalCashBalance)} icon={Wallet} color={C.success} bg={C.successBg} onPress={() => openBizRanking('cashBalances')} />
            <Stat title="Receivables" value={fmt(st.totalOutstandingReceivables || 0)} icon={TrendingUp} color={C.warning} bg={C.warningBg} onPress={() => openBizRanking('receivables')} />
            <Stat title="Payables" value={fmt(st.totalOutstandingPayables || 0)} icon={ShoppingCart} color={C.orange} bg={C.orangeBg} onPress={() => openBizRanking('payables')} />
            <Stat title="Low Stock" value={st.lowStockCount || 0} icon={AlertTriangle} color={C.error} bg={C.errorBg} onPress={() => openBizRanking('lowStock')} />
          </View>
        </>
      )}

      {/* Marketing Service Requests */}
      {marketingRequests.length > 0 && (
        <>
          <SecTitle title="MARKETING REQUESTS" />
          <View style={s.card}>
            {marketingRequests.slice(0, 10).map((req: any) => {
              const statusColors: Record<string, string> = {
                pending: C.warning, in_review: C.info, approved: C.success,
                in_progress: C.primary, completed: C.success, rejected: C.error,
              };
              const sc = statusColors[req.status] || C.textMuted;
              return (
                <View key={req.id} style={[s.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 6, paddingVertical: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{req.title}</Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                        {req.businesses?.legal_name || 'Unknown Business'} • {req.service_type}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: sc + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: sc, textTransform: 'capitalize' }}>
                        {req.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  {req.description ? (
                    <Text style={{ fontSize: 12, color: C.textMuted }} numberOfLines={2}>{req.description}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                    {req.urgency && req.urgency !== 'normal' ? (
                      <Text style={{ fontSize: 11, color: req.urgency === 'urgent' ? C.error : req.urgency === 'high' ? C.warning : C.textMuted, fontWeight: '600' }}>
                        {req.urgency.toUpperCase()}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 11, color: C.textMuted }}>{fmtDateTime(req.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );

  // ─── BUSINESSES TAB ───────────────────────
  const renderBusinesses = () => (
    <View>
      <DashboardSearchBar value={bizSearch} onChangeText={setBizSearch} placeholder="Search businesses by name, owner, GSTIN, phone..." />
      <Text style={s.sectionCount}>{filteredBiz.length} of {businesses.length} businesses</Text>
      {filteredBiz.length === 0 && <EmptyState message="No businesses match your search" />}
      {filteredBiz.map((b: any) => {
        const sb = getSubBadge(b);
        const expanded = expandedBizId === b.id;
        return (
          <TouchableOpacity key={b.id} style={s.bizCard} onPress={() => setExpandedBizId(expanded ? null : b.id)} activeOpacity={0.7}>
            <View style={s.bizCardHead}>
              <View style={[s.listIcon, { backgroundColor: C.primaryBg }]}><Building2 size={18} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.bizName}>{b.legal_name || b.owner_name || '—'}</Text>
                <Text style={s.bizOwner}>Owner: {b.owner_name} · {b.business_type}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={b.is_deleted ? 'Deleted' : 'Active'} color={b.is_deleted ? C.error : C.success} bg={b.is_deleted ? C.errorBg : C.successBg} />
                <Badge label={sb.label} color={sb.color} bg={sb.bg} />
                {expanded ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </View>
            </View>

            <View style={s.bizSummary}>
              <Text style={s.bizSummaryText}>{taxLabel(b)}{b.tax_id_type === 'GSTIN' && b.gstin_data?.pan ? ` · PAN: ${b.gstin_data.pan}` : ''}</Text>
              <Text style={s.bizSummaryText}>Phone: {b.phone} · {b.address_count} locations · {b.bank_account_count} banks · Funds: {fmt(Number(b.total_funds) || 0)}</Text>
              <Text style={s.bizSummaryText}>
                {b.is_on_trial ? `Trial: ${fmtDate(b.trial_start_date)} → ${fmtDate(b.trial_end_date)}` : `Subscription: ${b.subscription_status}`}
              </Text>
            </View>

            {expanded && renderBizExpanded(b)}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderBizExpanded = (b: any) => {
    const bizLocs = (data?.locations || []).filter((l: any) => l.business_id === b.id && !l.is_deleted);
    const bizBanks = (data?.bankAccounts || []).filter((ba: any) => ba.business_id === b.id && !ba.is_deleted);
    const bizStaff = (data?.staff || []).filter((st2: any) => st2.business_id === b.id && !st2.is_deleted);
    const bizInvoices = (data?.invoices || []).filter((inv: any) => inv.business_id === b.id && !inv.is_deleted).slice(0, 5);
    const bizSub = (data?.subscriptions || []).find((sub: any) => sub.business_id === b.id && !sub.is_deleted);

    return (
      <View style={s.bizExpanded}>
        {bizSub && (
          <View style={s.bizExpandSection}>
            <Text style={s.bizExpandTitle}>Subscription</Text>
            <Text style={s.bizExpandText}>Status: {bizSub.status} · Trial: {bizSub.is_on_trial ? 'Yes' : 'No'}</Text>
            <Text style={s.bizExpandText}>Period: {fmtDate(bizSub.current_period_start)} → {fmtDate(bizSub.current_period_end)}</Text>
          </View>
        )}
        {bizLocs.length > 0 && (
          <View style={s.bizExpandSection}>
            <Text style={s.bizExpandTitle}>Locations ({bizLocs.length})</Text>
            {bizLocs.map((l: any) => (
              <View key={l.id} style={s.bizExpandItem}>
                <Text style={s.bizExpandItemTitle}>{l.name || l.address_line1 || '—'}</Text>
                <Text style={s.bizExpandText}>{[l.address_line1, l.city, l.state, l.pincode].filter(Boolean).join(', ')}</Text>
              </View>
            ))}
          </View>
        )}
        {bizBanks.length > 0 && (
          <View style={s.bizExpandSection}>
            <Text style={s.bizExpandTitle}>Bank Accounts ({bizBanks.length})</Text>
            {bizBanks.map((ba: any) => (
              <View key={ba.id} style={s.bizExpandItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.bizExpandItemTitle}>{ba.bank_name} — {ba.account_number}</Text>
                  <Text style={[s.bizExpandItemTitle, { color: C.primary }]}>{fmt(Number(ba.current_balance) || 0)}</Text>
                </View>
                <Text style={s.bizExpandText}>{ba.account_holder_name || '—'} · {ba.is_primary ? 'Primary' : 'Secondary'} · IFSC: {ba.ifsc_code || '—'}</Text>
              </View>
            ))}
          </View>
        )}
        {bizStaff.length > 0 && (
          <View style={s.bizExpandSection}>
            <Text style={s.bizExpandTitle}>Staff ({bizStaff.length})</Text>
            {bizStaff.map((st2: any) => (
              <View key={st2.id} style={s.bizExpandItem}>
                <Text style={s.bizExpandItemTitle}>{st2.name || st2.mobile || '—'}</Text>
                <Text style={s.bizExpandText}>{st2.role || '—'} · {st2.mobile || '—'}</Text>
              </View>
            ))}
          </View>
        )}
        {bizInvoices.length > 0 && (
          <View style={s.bizExpandSection}>
            <Text style={s.bizExpandTitle}>Recent Invoices (last 5)</Text>
            {bizInvoices.map((inv: any) => (
              <View key={inv.id} style={s.bizExpandItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.bizExpandItemTitle}>{inv.invoice_number || inv.id.substring(0, 8)}</Text>
                  <Text style={[s.bizExpandItemTitle, { color: C.success }]}>{fmt(Number(inv.total_amount) || 0)}</Text>
                </View>
                <Text style={s.bizExpandText}>{inv.customer_name || 'Walk-in'} · {fmtDateTime(inv.created_at)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.bizCreatedAt}>Created: {new Date(b.created_at).toLocaleString('en-IN')}</Text>
      </View>
    );
  };

  // ─── USERS & STAFF TAB ────────────────────
  const renderUsers = () => {
    const authUsers: any[] = data?.authUsers || [];
    const appUsers: any[] = data?.users || [];
    const staffList: any[] = (data?.staff || []).filter((st2: any) => !st2.is_deleted);
    const q = userSearch.toLowerCase();

    const filteredAuth = q ? authUsers.filter(u => (u.phone || '').includes(q) || (u.email || '').toLowerCase().includes(q) || (u.id || '').includes(q)) : [];
    const filteredApp = q ? appUsers.filter(u => (u.name || '').toLowerCase().includes(q) || (u.mobile || '').includes(q)) : [];
    const filteredStaff = q ? staffList.filter(st2 => (st2.name || '').toLowerCase().includes(q) || (st2.mobile || '').includes(q) || (st2.role || '').toLowerCase().includes(q) || getBizName(st2.business_id).toLowerCase().includes(q)) : [];

    return (
      <View>
        <View style={s.statsGrid}>
          <Stat title="Auth Users" value={authUsers.length} icon={Shield} color={C.accent} bg={C.accentBg} />
          <Stat title="App Users" value={appUsers.length} icon={Users} color={C.primary} bg={C.primaryBg} />
          <Stat title="Staff" value={staffList.length} icon={UserCheck} color={C.teal} bg={C.tealBg} />
        </View>

        <View style={{ marginTop: 16 }}>
          <DashboardSearchBar value={userSearch} onChangeText={setUserSearch} placeholder="Search by name, phone, email, role, business..." />
        </View>

        {!q && <EmptyState message="Use the search bar above to find users or staff" />}

        {q && filteredAuth.length === 0 && filteredApp.length === 0 && filteredStaff.length === 0 && (
          <EmptyState message={`No results for "${userSearch}"`} />
        )}

        {filteredAuth.length > 0 && (
          <>
            <Text style={s.sectionCount}>Auth Users ({filteredAuth.length})</Text>
            {filteredAuth.slice(0, PAGE_SIZE).map((u: any) => (
              <View key={u.id} style={s.listCard}>
                <View style={s.listCardHead}>
                  <View style={[s.listIcon, { backgroundColor: C.accentBg }]}><Shield size={14} color={C.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{u.phone || u.email || u.id.substring(0, 16)}</Text>
                    <Text style={s.listSub}>Last sign-in: {u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : 'Never'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {filteredApp.length > 0 && (
          <>
            <Text style={s.sectionCount}>App Users ({filteredApp.length})</Text>
            {filteredApp.slice(0, PAGE_SIZE).map((u: any) => (
              <View key={u.id} style={s.listCard}>
                <View style={s.listCardHead}>
                  <View style={[s.listIcon, { backgroundColor: C.primaryBg }]}><Users size={14} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{u.name || u.mobile || '—'}</Text>
                    <Text style={s.listSub}>Mobile: {u.mobile || '—'} · Role: {u.role || 'user'} · {getBizName(u.business_id)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {filteredStaff.length > 0 && (
          <>
            <Text style={s.sectionCount}>Staff ({filteredStaff.length})</Text>
            {filteredStaff.slice(0, PAGE_SIZE).map((st2: any) => (
              <View key={st2.id} style={s.listCard}>
                <View style={s.listCardHead}>
                  <View style={[s.listIcon, { backgroundColor: C.tealBg }]}><UserCheck size={14} color={C.teal} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{st2.name || st2.mobile || '—'}</Text>
                    <Text style={s.listSub}>{st2.role || '—'} · {st2.mobile || '—'} · {getBizName(st2.business_id)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  // ─── ACTIVITY TAB ─────────────────────────
  const renderActivity = () => {
    const signups: any[] = data?.signupProgress || [];
    const q = activitySearch.toLowerCase();
    const filtered = q
      ? signups.filter(sp => (sp.mobile_number || '').includes(q) || (sp.current_step || '').toLowerCase().includes(q) || (sp.gstin || '').toLowerCase().includes(q) || (sp.business_name || '').toLowerCase().includes(q) || (sp.pan || '').toLowerCase().includes(q) || (sp.owner_name || '').toLowerCase().includes(q))
      : signups;

    return (
      <View>
        <View style={s.statsGrid}>
          <Stat title="Total Signups" value={signups.length} icon={ClipboardList} color={C.primary} bg={C.primaryBg} />
          <Stat title="Completed" value={signups.filter(s2 => ['signupComplete', 'completed', 'complete'].includes(s2.current_step)).length} icon={CheckCircle} color={C.success} bg={C.successBg} />
          <Stat title="In Progress" value={signups.filter(s2 => !['signupComplete', 'completed', 'complete'].includes(s2.current_step)).length} icon={Clock} color={C.warning} bg={C.warningBg} />
        </View>

        <View style={{ marginTop: 16 }}>
          <DashboardSearchBar value={activitySearch} onChangeText={setActivitySearch} placeholder="Search by phone, step, GSTIN, business name..." />
        </View>

        <Text style={s.sectionCount}>{filtered.length} signups</Text>

        {filtered.length === 0 && <EmptyState message={q ? `No results for "${activitySearch}"` : 'No signup activity yet'} />}

        {filtered.slice(0, PAGE_SIZE).map((sp: any) => (
          <View key={sp.id} style={s.listCard}>
            <View style={s.listCardHead}>
              <View style={[s.listIcon, { backgroundColor: C.warningBg }]}><ClipboardList size={14} color={C.warning} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{sp.mobile_number || sp.id.substring(0, 16)}</Text>
                <Text style={s.listSub}>Step: {sp.current_step || '—'} · {sp.gstin ? (sp.gstin.length === 15 ? `GSTIN: ${sp.gstin}` : `PAN: ${sp.gstin}`) : '—'}</Text>
                {sp.business_name && <Text style={s.listSub}>Business: {sp.business_name}</Text>}
                <Text style={s.listSub}>Updated: {fmtDateTime(sp.updated_at)}</Text>
              </View>
              <Badge
                label={['completed', 'signupComplete', 'complete'].includes(sp.current_step) ? 'Done' : 'In Progress'}
                color={['completed', 'signupComplete', 'complete'].includes(sp.current_step) ? C.success : C.warning}
                bg={['completed', 'signupComplete', 'complete'].includes(sp.current_step) ? C.successBg : C.warningBg}
              />
            </View>
          </View>
        ))}
        {filtered.length > PAGE_SIZE && <Text style={s.moreText}>Showing first {PAGE_SIZE} of {filtered.length}. Use search to narrow down.</Text>}
      </View>
    );
  };

  // ─── AUDIT TAB ────────────────────────────
  const renderAudit = () => {
    const audits: any[] = data?.auditLogs || [];
    const q = auditSearch.toLowerCase();
    const filtered = q
      ? audits.filter(log => (log.table_name || '').toLowerCase().includes(q) || (log.action || '').toLowerCase().includes(q) || (log.record_id || '').includes(q) || getBizName(log.business_id || '').toLowerCase().includes(q))
      : audits;
    const visible = filtered.slice(0, auditPage * PAGE_SIZE);
    const hasMore = visible.length < filtered.length;

    return (
      <View>
        <View style={s.statsGrid}>
          {Object.entries(auditActionCounts).map(([action, count]) => {
            const color = action === 'INSERT' ? C.success : action === 'UPDATE' ? C.warning : action === 'DELETE' ? C.error : C.textMuted;
            const bg = action === 'INSERT' ? C.successBg : action === 'UPDATE' ? C.warningBg : action === 'DELETE' ? C.errorBg : C.bg;
            return <Stat key={action} title={action} value={count as number} icon={FileText} color={color} bg={bg} />;
          })}
          <Stat title="Total Entries" value={audits.length} icon={FileText} color={C.primary} bg={C.primaryBg} />
        </View>

        <View style={{ marginTop: 16 }}>
          <DashboardSearchBar value={auditSearch} onChangeText={(t) => { setAuditSearch(t); setAuditPage(1); }} placeholder="Search by table, action, record ID..." />
        </View>

        <Text style={s.sectionCount}>{filtered.length} audit entries</Text>

        {visible.map((log: any, i: number) => {
          const ac = log.action === 'INSERT' ? C.success : log.action === 'UPDATE' ? C.warning : log.action === 'DELETE' ? C.error : C.textMuted;
          const ab = log.action === 'INSERT' ? C.successBg : log.action === 'UPDATE' ? C.warningBg : log.action === 'DELETE' ? C.errorBg : C.bg;
          return (
            <View key={log.id || i} style={s.auditCard}>
              <View style={s.auditHead}><Badge label={log.action} color={ac} bg={ab} /><Text style={s.auditTable}>{log.table_name}</Text><Text style={s.auditTime}>{fmtDateTime(log.performed_at)}</Text></View>
              <Text style={s.auditMeta}>Record: {log.record_id?.substring(0, 16) || '—'} · By: {log.performed_by?.substring(0, 16) || 'System'}</Text>
              <Text style={[s.auditMeta, { fontSize: 10, color: C.textMuted }]}>{getBizName(log.business_id || '')}</Text>
            </View>
          );
        })}

        {hasMore && (
          <TouchableOpacity style={s.loadMoreBtn} onPress={() => setAuditPage(p => p + 1)} activeOpacity={0.7}>
            <Text style={s.loadMoreText}>Load More ({filtered.length - visible.length} remaining)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── DEVICES TAB ──────────────────────────
  const renderDevices = () => {
    const devices: any[] = data?.deviceSnapshots || [];
    const q = deviceSearch.toLowerCase();
    const filtered = q
      ? devices.filter(d => (d.device_brand || '').toLowerCase().includes(q) || (d.device_model || '').toLowerCase().includes(q) || (d.os_name || '').toLowerCase().includes(q) || (d.carrier_name || '').toLowerCase().includes(q))
      : devices;
    const visible = filtered.slice(0, devicePage * PAGE_SIZE);
    const hasMore = visible.length < filtered.length;

    return (
      <View>
        {st.devicesByBrand && Object.keys(st.devicesByBrand).length > 0 && (
          <View style={[s.card, { marginBottom: 12 }]}>
            <Text style={s.cardTitle}>By Brand</Text>
            {Object.entries(st.devicesByBrand).sort((a: any, b: any) => b[1] - a[1]).map(([brand, count]: [string, any]) => (
              <View key={brand} style={s.row}><Text style={s.rowLabel}>{brand}</Text><Text style={s.rowValue}>{count}</Text></View>
            ))}
          </View>
        )}
        {st.devicesByOS && Object.keys(st.devicesByOS).length > 0 && (
          <View style={[s.card, { marginBottom: 12 }]}>
            <Text style={s.cardTitle}>By OS</Text>
            {Object.entries(st.devicesByOS).sort((a: any, b: any) => b[1] - a[1]).map(([os, count]: [string, any]) => (
              <View key={os} style={s.row}><Text style={s.rowLabel}>{os}</Text><Text style={s.rowValue}>{count}</Text></View>
            ))}
          </View>
        )}

        <DashboardSearchBar value={deviceSearch} onChangeText={(t) => { setDeviceSearch(t); setDevicePage(1); }} placeholder="Search by brand, model, OS, carrier..." />
        <Text style={s.sectionCount}>{filtered.length} devices</Text>

        {visible.map((d: any) => (
          <View key={d.id} style={s.listCard}>
            <View style={s.listCardHead}>
              <View style={[s.listIcon, { backgroundColor: C.tealBg }]}><Smartphone size={14} color={C.teal} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{d.device_brand || '?'} {d.device_model || ''}</Text>
                <Text style={s.listSub}>OS: {d.os_name || '?'} {d.os_version || ''} · {d.is_emulator ? 'Emulator' : 'Physical'}</Text>
                <Text style={s.listSub}>Screen: {d.screen_width}x{d.screen_height} · RAM: {d.total_memory ? Math.round(d.total_memory / 1073741824) + ' GB' : '?'}</Text>
                <Text style={[s.listSub, { color: C.textMuted, fontSize: 10 }]}>{fmtDateTime(d.created_at)}</Text>
              </View>
            </View>
          </View>
        ))}

        {hasMore && (
          <TouchableOpacity style={s.loadMoreBtn} onPress={() => setDevicePage(p => p + 1)} activeOpacity={0.7}>
            <Text style={s.loadMoreText}>Load More ({filtered.length - visible.length} remaining)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── MAIN RENDER ──────────────────────────
  const renderContent = () => {
    if (loading && !data) return <View style={s.center}><ActivityIndicator size="large" color={C.primary} /><Text style={s.loadingText}>Loading platform data...</Text></View>;
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'businesses': return renderBusinesses();
      case 'users': return renderUsers();
      case 'activity': return renderActivity();
      case 'audit': return renderAudit();
      case 'devices': return renderDevices();
    }
  };

  const tabLabel = TABS.find(t => t.id === activeTab)?.label || 'Overview';

  // ─── RENDER BIZ RANKING DETAIL ROW ────────
  const renderDetailRow = (item: any, metric: BizMetricKey) => {
    switch (metric) {
      case 'totalRevenue':
      case 'todayRevenue':
      case 'todayInvoices':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>{item.invoice_number || item.id?.substring(0, 8)}</Text>
              <Text style={[s.bizExpandItemTitle, { color: C.success }]}>{fmt(Number(item.total_amount) || 0)}</Text>
            </View>
            <Text style={s.bizExpandText}>{item.customer_name || 'Walk-in'} · {fmtDateTime(item.created_at)}</Text>
          </View>
        );
      case 'bankBalances':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>{item.bank_name} — {item.account_number}</Text>
              <Text style={[s.bizExpandItemTitle, { color: C.primary }]}>{fmt(Number(item.current_balance) || 0)}</Text>
            </View>
            <Text style={s.bizExpandText}>{item.account_holder_name || '—'} · {item.is_primary ? 'Primary' : 'Secondary'}</Text>
            <Text style={s.bizExpandText}>Opening Balance: {fmt(Number(item.initial_balance) || 0)}</Text>
          </View>
        );
      case 'cashBalances':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>Cash Balance</Text>
              <Text style={[s.bizExpandItemTitle, { color: C.success }]}>{fmt(Number(item.current_balance) || 0)}</Text>
            </View>
            <Text style={s.bizExpandText}>Opening Balance: {fmt(Number(item.initial_balance) || 0)}</Text>
          </View>
        );
      case 'receivables':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>{item.name || item.phone || '—'}</Text>
              <Text style={[s.bizExpandItemTitle, { color: C.warning }]}>{fmt(Number(item.outstanding_balance) || 0)}</Text>
            </View>
            <Text style={s.bizExpandText}>Phone: {item.phone || '—'}</Text>
          </View>
        );
      case 'payables':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>{item.name || '—'}</Text>
              <Text style={[s.bizExpandItemTitle, { color: C.orange }]}>{fmt(Number(item.outstanding_balance) || 0)}</Text>
            </View>
            <Text style={s.bizExpandText}>Phone: {item.phone || '—'}</Text>
          </View>
        );
      case 'lowStock':
        return (
          <View style={s.bizExpandItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.bizExpandItemTitle}>{item.name || '—'}</Text>
              <Badge label={`${item.current_stock}/${item.min_stock_level}`} color={C.error} bg={C.errorBg} />
            </View>
            <Text style={s.bizExpandText}>Price: {fmt(Number(item.selling_price) || 0)}</Text>
          </View>
        );
      default: return null;
    }
  };

  // ─── RENDER PLATFORM DRILL ITEM ───────────
  const renderPlatformDrillItem = (item: any, idx: number) => {
    switch (drillType) {
      case 'business': {
        const sb = getSubBadge(item);
        return (
          <View key={item.id || idx} style={s.drillItem}>
            <View style={s.drillItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.drillItemTitle}>{item.legal_name || item.owner_name}</Text>
                <Text style={s.drillItemSub}>{taxLabel(item)}</Text>
                <Text style={s.drillItemSub}>Owner: {item.owner_name} · {item.business_type}</Text>
              </View>
              <Badge label={sb.label} color={sb.color} bg={sb.bg} />
            </View>
            {item.is_on_trial && (
              <View style={s.drillItemMeta}>
                <Text style={s.drillMetaText}>Trial: {fmtDate(item.trial_start_date)} → {fmtDate(item.trial_end_date)}</Text>
              </View>
            )}
          </View>
        );
      }
      case 'subscription': return (
        <View key={item.id || idx} style={s.drillItem}>
          <View style={s.drillItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.drillItemTitle}>{getBizName(item.business_id)}</Text>
              <Text style={s.drillItemSub}>Status: {item.status} · Trial: {item.is_on_trial ? 'Yes' : 'No'}</Text>
              <Text style={s.drillItemSub}>{fmtDate(item.trial_start_date)} → {fmtDate(item.trial_end_date)}</Text>
            </View>
            <Badge label={item.status} color={item.status === 'trialing' ? C.info : item.status === 'active' ? C.success : C.error} bg={item.status === 'trialing' ? C.infoBg : item.status === 'active' ? C.successBg : C.errorBg} />
          </View>
        </View>
      );
      case 'signup': return (
        <View key={item.id || idx} style={s.drillItem}>
          <View style={s.drillItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.drillItemTitle}>{item.mobile_number || '—'}</Text>
              <Text style={s.drillItemSub}>Step: {item.current_step || '—'} · {item.gstin ? (item.gstin.length === 15 ? `GSTIN: ${item.gstin}` : `PAN: ${item.gstin}`) : '—'}</Text>
              <Text style={s.drillItemSub}>{fmtDateTime(item.updated_at)}</Text>
            </View>
            <Badge label={['signupComplete', 'completed', 'complete'].includes(item.current_step) ? 'Done' : 'In Progress'} color={['signupComplete', 'completed', 'complete'].includes(item.current_step) ? C.success : C.warning} bg={['signupComplete', 'completed', 'complete'].includes(item.current_step) ? C.successBg : C.warningBg} />
          </View>
        </View>
      );
      case 'info': return (
        <View key={idx} style={s.drillItem}>
          <View style={s.drillItemRow}>
            <Text style={s.drillItemTitle}>{item.label}</Text>
            <Text style={[s.drillItemTitle, { color: C.primary }]}>{item.value}</Text>
          </View>
        </View>
      );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom', 'left', 'right']}>
      {isDesktop && renderSidebar()}
      {!isDesktop && sidebarOpen && (
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSidebarOpen(false)}>
          {renderSidebar()}
        </TouchableOpacity>
      )}
      <View style={[s.main, isDesktop && { marginLeft: 0 }]}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            {!isDesktop && <TouchableOpacity onPress={() => setSidebarOpen(true)} style={{ marginRight: 10 }}><Menu size={22} color={C.text} /></TouchableOpacity>}
            <Shield size={18} color={C.primary} />
            <Text style={s.headerTitle}>{tabLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => safeRouter.push('/admin/search')} style={s.refreshBtn} activeOpacity={0.7}><Search size={16} color={C.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={s.refreshBtn} activeOpacity={0.7}><RefreshCw size={16} color={C.textSecondary} /></TouchableOpacity>
          </View>
        </View>

        {!isDesktop && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarInner}>
            {TABS.map(t => { const Icon = t.icon; const active = activeTab === t.id; return (
              <TouchableOpacity key={t.id} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(t.id)} activeOpacity={0.7}>
                <Icon size={13} color={active ? C.primary : C.textMuted} /><Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ); })}
          </ScrollView>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
          {renderContent()}
        </ScrollView>
      </View>

      {/* ── BUSINESS RANKING MODAL ── */}
      <Modal visible={rankingOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRankingOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.drillHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.drillTitle}>{rankingMetric ? metricLabels[rankingMetric] : ''}</Text>
              <Text style={s.drillCount}>{filteredRankingData.length} businesses · sorted highest to lowest</Text>
            </View>
            <TouchableOpacity onPress={() => setRankingOpen(false)} style={s.drillClose}><X size={20} color={C.text} /></TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <DashboardSearchBar value={rankingSearch} onChangeText={setRankingSearch} placeholder="Search businesses..." />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {filteredRankingData.length === 0 && <EmptyState message="No businesses found" />}
            {filteredRankingData.map((r, idx) => {
              const sb = getSubBadge(r.business);
              const isSelected = rankingSelectedBiz === r.business.id;
              return (
                <TouchableOpacity
                  key={r.business.id}
                  style={[s.bizCard, isSelected && { borderColor: C.primary, borderWidth: 2 }]}
                  onPress={() => setRankingSelectedBiz(isSelected ? null : r.business.id)}
                  activeOpacity={0.7}
                >
                  <View style={s.bizCardHead}>
                    <View style={[s.rankBadge, { backgroundColor: idx < 3 ? C.primaryBg : C.bg }]}>
                      <Text style={[s.rankText, { color: idx < 3 ? C.primary : C.textMuted }]}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bizName}>{r.business.legal_name || r.business.owner_name || '—'}</Text>
                      <Text style={s.bizOwner}>{r.business.business_type} · {taxLabel(r.business)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.rankValue}>{r.displayValue}</Text>
                      <Badge label={sb.label} color={sb.color} bg={sb.bg} />
                    </View>
                  </View>

                  {isSelected && rankingMetric && (
                    <View style={s.bizExpanded}>
                      <Text style={s.bizExpandTitle}>
                        {metricLabels[rankingMetric]} Breakdown ({r.details.length} items)
                      </Text>
                      {r.details.length === 0 && <Text style={s.bizExpandText}>No data for this business</Text>}
                      {r.details.slice(0, 10).map((detail, dIdx) => (
                        <React.Fragment key={detail.id || dIdx}>
                          {renderDetailRow(detail, rankingMetric)}
                        </React.Fragment>
                      ))}
                      {r.details.length > 10 && <Text style={s.moreText}>+{r.details.length - 10} more items</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── PLATFORM DRILL-DOWN MODAL ── */}
      <Modal visible={drillOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDrillOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.drillHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.drillTitle}>{drillTitle}</Text>
              <Text style={s.drillCount}>{drillItems.length} items</Text>
            </View>
            <TouchableOpacity onPress={() => setDrillOpen(false)} style={s.drillClose}><X size={20} color={C.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent}>
            {drillItems.length === 0 && <EmptyState message="No data available" />}
            {drillItems.map((item, idx) => renderPlatformDrillItem(item, idx))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── STYLES ─────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, flexDirection: 'row' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { color: C.textSecondary, fontSize: 14, marginTop: 12 },
  deniedTitle: { color: C.error, fontSize: 22, fontWeight: '700', marginTop: 16 },
  deniedSub: { color: C.textSecondary, fontSize: 14, marginTop: 6 },
  backBtn: { marginTop: 20, backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  sidebar: { width: 250, backgroundColor: '#FFF', borderRightWidth: 1, borderRightColor: C.border },
  sidebarDesktop: { ...Platform.select({ web: { height: '100vh' as any }, default: {} }) },
  sidebarHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  sidebarLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  sidebarBrand: { fontSize: 16, fontWeight: '700', color: C.text },
  sidebarRole: { fontSize: 11, color: C.primary, fontWeight: '600' },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 10, marginHorizontal: 8, marginVertical: 1, borderRadius: 8 },
  sidebarItemActive: { backgroundColor: C.primaryBg },
  sidebarItemText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  sidebarItemTextActive: { color: C.primary, fontWeight: '600' },
  sidebarFooter: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, flexDirection: 'row' },

  main: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  refreshBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },

  tabBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 44 },
  tabBarInner: { paddingHorizontal: 8, gap: 2, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, gap: 5 },
  tabActive: { backgroundColor: C.primaryBg },
  tabText: { color: C.textMuted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: C.primary, fontWeight: '600' },

  toggle: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  toggleTextActive: { color: '#FFF' },

  secDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 14, gap: 10 },
  secDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  secDividerText: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, minWidth: 140 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, fontWeight: '500', color: C.textMuted, marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.bg },
  rowLabel: { fontSize: 13, color: C.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '700', color: C.text },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 4, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: Platform.OS === 'ios' ? 0 : 6, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  sectionCount: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginBottom: 10, marginTop: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  // List cards
  listCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  listCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  listSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },

  // Business cards
  bizCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  bizCardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, paddingBottom: 8 },
  bizName: { fontSize: 15, fontWeight: '700', color: C.text },
  bizOwner: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  bizSummary: { paddingHorizontal: 14, paddingBottom: 10 },
  bizSummaryText: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  bizExpanded: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, backgroundColor: C.bg },
  bizExpandSection: { marginBottom: 12 },
  bizExpandTitle: { fontSize: 12, fontWeight: '700', color: C.primary, marginBottom: 6 },
  bizExpandText: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  bizExpandItem: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  bizExpandItemTitle: { fontSize: 12, fontWeight: '600', color: C.text },
  bizCreatedAt: { fontSize: 10, color: C.textMuted, marginTop: 4 },

  // Ranking modal
  rankBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  rankValue: { fontSize: 16, fontWeight: '800', color: C.text },

  // Audit
  auditCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  auditHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  auditTable: { fontSize: 13, fontWeight: '600', color: C.text, flex: 1 },
  auditTime: { fontSize: 10, color: C.textMuted },
  auditMeta: { fontSize: 10, color: C.textSecondary, marginTop: 4 },

  // Load more
  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.primary, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: C.primary },
  moreText: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Drill-down modal
  drillHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.border },
  drillTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  drillCount: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  drillClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  drillItem: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  drillItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drillItemTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  drillItemSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  drillItemMeta: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.bg },
  drillMetaText: { fontSize: 10, color: C.textMuted, marginTop: 1 },
});
