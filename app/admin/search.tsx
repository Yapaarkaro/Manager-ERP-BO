import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search,
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Package,
  ShoppingCart,
  UserCheck,
  CreditCard,
  MapPin,
  IndianRupee,
  TrendingUp,
  RotateCcw,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Mail,
  Calendar,
  Tag,
  BarChart3,
  Layers,
  Truck,
  History,
  Settings,
  Megaphone,
  AlertTriangle,
  Shield,
  Clock,
} from 'lucide-react-native';
import {
  searchAll,
  getFullBusinessDetail,
  searchProducts,
  verifySuperadmin,
} from '@/services/superadminApi';

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

const fmt = (n: number) => {
  if (n >= 10000000) return '\u20B9' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '\u20B9' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString('en-IN');
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

type ViewMode = 'search' | 'business_detail' | 'product_detail';

type SectionKey =
  | 'summary'
  | 'locations'
  | 'bankAccounts'
  | 'bankTransactions'
  | 'staff'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'invoices'
  | 'purchaseOrders'
  | 'purchaseInvoices'
  | 'returns'
  | 'subscriptions'
  | 'marketing'
  | 'settings'
  | 'inventoryLogs';

export default function SuperadminSearch() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [businessDetail, setBusinessDetail] = useState<any>(null);
  const [productDetail, setProductDetail] = useState<any>(null);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ summary: true });
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      const result = await searchAll(q.trim());
      if (result?.success) {
        setSearchResults(result);
        setViewMode('search');
      } else {
        setError(result?.error || 'Search failed');
      }
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(text), 600);
    }
  };

  const openBusinessDetail = async (businessId: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await getFullBusinessDetail(businessId);
      if (result?.success) {
        setBusinessDetail(result);
        setViewMode('business_detail');
        setExpandedSections({ summary: true });
      } else {
        setError(result?.error || 'Failed to load business');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  const openProductDetail = async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await searchProducts(q);
      if (result?.success) {
        setProductDetail(result);
        setViewMode('product_detail');
        setExpandedProducts({});
      } else {
        setError(result?.error || 'Failed to load products');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (viewMode !== 'search') {
      setViewMode('search');
      setBusinessDetail(null);
      setProductDetail(null);
    } else {
      router.back();
    }
  };

  const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );

  const InfoRow = ({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, mono && s.mono]}>{value ?? 'N/A'}</Text>
    </View>
  );

  const SectionHeader = ({ sKey, title, icon: Icon, count, color, bg }: { sKey: SectionKey; title: string; icon: any; count?: number; color: string; bg: string }) => {
    const expanded = expandedSections[sKey];
    return (
      <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection(sKey)} activeOpacity={0.7}>
        <View style={[s.sectionIcon, { backgroundColor: bg }]}>
          <Icon size={16} color={color} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        {count !== undefined && <Badge label={String(count)} color={C.textSecondary} bg={C.bg} />}
        {expanded ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
      </TouchableOpacity>
    );
  };

  // ========== SEARCH RESULTS ==========
  const renderSearchResults = () => {
    if (!searchResults) return null;
    const { businesses = [], staff = [], invoices = [], purchaseOrders = [], purchaseInvoices = [], customers = [], suppliers = [], products = [], totalResults = 0 } = searchResults;
    const hasResults = totalResults > 0;

    if (!hasResults) {
      return (
        <View style={s.emptyState}>
          <Search size={48} color={C.textMuted} />
          <Text style={s.emptyTitle}>No results found</Text>
          <Text style={s.emptySub}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={s.resultCount}>{totalResults} results found</Text>

        {businesses.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <Building2 size={16} color={C.primary} />
              <Text style={s.resultSectionTitle}>Businesses ({businesses.length})</Text>
            </View>
            {businesses.map((b: any) => (
              <TouchableOpacity key={b.id} style={s.resultCard} onPress={() => openBusinessDetail(b.id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.primaryBg }]}>
                    <Building2 size={14} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{b.legal_name || 'Unnamed'}</Text>
                    <Text style={s.resultSub}>Owner: {b.owner_name || 'N/A'} {'\u00B7'} {b.business_type || 'N/A'}</Text>
                    {b.tax_id && <Text style={s.resultSub}>GSTIN/PAN: {b.tax_id}</Text>}
                    {b.matchedVia && b.matchedVia !== 'direct' && (
                      <Badge label={`via ${b.matchedVia}`} color={C.info} bg={C.infoBg} />
                    )}
                  </View>
                  <ChevronRight size={16} color={C.textMuted} />
                </View>
                <View style={s.resultMeta}>
                  <Text style={s.resultMetaText}>Subscription: {b.subscription_status || 'N/A'}</Text>
                  <Text style={s.resultMetaText}>Funds: {fmt(Number(b.total_funds) || 0)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {staff.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <UserCheck size={16} color={C.teal} />
              <Text style={s.resultSectionTitle}>Staff ({staff.length})</Text>
            </View>
            {staff.map((st: any) => (
              <TouchableOpacity key={st.id} style={s.resultCard} onPress={() => openBusinessDetail(st.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.tealBg }]}>
                    <UserCheck size={14} color={C.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{st.name}</Text>
                    <Text style={s.resultSub}>{st.role || 'N/A'} {'\u00B7'} {st.mobile || 'N/A'}</Text>
                    <Text style={s.resultSub}>Business: {st.businessName}</Text>
                  </View>
                  <Badge label={st.status || 'active'} color={st.status === 'inactive' ? C.error : C.success} bg={st.status === 'inactive' ? C.errorBg : C.successBg} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {invoices.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <FileText size={16} color={C.info} />
              <Text style={s.resultSectionTitle}>Invoices ({invoices.length})</Text>
            </View>
            {invoices.map((inv: any) => (
              <TouchableOpacity key={inv.id} style={s.resultCard} onPress={() => openBusinessDetail(inv.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.infoBg }]}>
                    <FileText size={14} color={C.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{inv.invoice_number}</Text>
                    <Text style={s.resultSub}>Customer: {inv.customer_name || 'Walk-in'} {'\u00B7'} {fmtDate(inv.invoice_date)}</Text>
                    <Text style={s.resultSub}>Business: {inv.businessName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.resultTitle, { color: C.success }]}>{fmt(Number(inv.total_amount) || 0)}</Text>
                    <Badge
                      label={inv.payment_status || 'unknown'}
                      color={inv.payment_status === 'paid' ? C.success : inv.payment_status === 'partial' ? C.warning : C.error}
                      bg={inv.payment_status === 'paid' ? C.successBg : inv.payment_status === 'partial' ? C.warningBg : C.errorBg}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {purchaseOrders.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <ClipboardList size={16} color={C.accent} />
              <Text style={s.resultSectionTitle}>Purchase Orders ({purchaseOrders.length})</Text>
            </View>
            {purchaseOrders.map((po: any) => (
              <TouchableOpacity key={po.id} style={s.resultCard} onPress={() => openBusinessDetail(po.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.accentBg }]}>
                    <ClipboardList size={14} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{po.po_number}</Text>
                    <Text style={s.resultSub}>Supplier: {po.supplier_name || 'N/A'} {'\u00B7'} {fmtDate(po.order_date)}</Text>
                    <Text style={s.resultSub}>Business: {po.businessName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.resultTitle, { color: C.primary }]}>{fmt(Number(po.total_amount) || 0)}</Text>
                    <Badge label={po.status || 'unknown'} color={C.accent} bg={C.accentBg} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {purchaseInvoices.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <Truck size={16} color={C.orange} />
              <Text style={s.resultSectionTitle}>Purchase Invoices ({purchaseInvoices.length})</Text>
            </View>
            {purchaseInvoices.map((pi: any) => (
              <TouchableOpacity key={pi.id} style={s.resultCard} onPress={() => openBusinessDetail(pi.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.orangeBg }]}>
                    <Truck size={14} color={C.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{pi.invoice_number}</Text>
                    <Text style={s.resultSub}>Supplier: {pi.supplier_name || 'N/A'} {'\u00B7'} PO: {pi.po_number || 'N/A'}</Text>
                    <Text style={s.resultSub}>Business: {pi.businessName}</Text>
                  </View>
                  <Text style={[s.resultTitle, { color: C.orange }]}>{fmt(Number(pi.total_amount) || 0)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {customers.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <Users size={16} color={C.info} />
              <Text style={s.resultSectionTitle}>Customers ({customers.length})</Text>
            </View>
            {customers.map((c: any) => (
              <TouchableOpacity key={c.id} style={s.resultCard} onPress={() => openBusinessDetail(c.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.infoBg }]}>
                    <Users size={14} color={C.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{c.name || c.business_name || 'Unnamed'}</Text>
                    <Text style={s.resultSub}>{c.mobile || 'No phone'} {'\u00B7'} {c.customer_type || 'retail'}</Text>
                    {c.gstin && <Text style={s.resultSub}>GSTIN: {c.gstin}</Text>}
                    <Text style={s.resultSub}>Business: {c.ownerBusinessName}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {suppliers.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <ShoppingCart size={16} color={C.orange} />
              <Text style={s.resultSectionTitle}>Suppliers ({suppliers.length})</Text>
            </View>
            {suppliers.map((sp: any) => (
              <TouchableOpacity key={sp.id} style={s.resultCard} onPress={() => openBusinessDetail(sp.business_id)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.orangeBg }]}>
                    <ShoppingCart size={14} color={C.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{sp.business_name || sp.contact_person || 'Unnamed'}</Text>
                    <Text style={s.resultSub}>{sp.mobile_number || 'No phone'} {'\u00B7'} {sp.city || ''} {sp.state || ''}</Text>
                    {sp.gstin_pan && <Text style={s.resultSub}>GSTIN/PAN: {sp.gstin_pan}</Text>}
                    <Text style={s.resultSub}>Business: {sp.ownerBusinessName}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {products.length > 0 && (
          <View style={s.resultSection}>
            <View style={s.resultSectionHead}>
              <Package size={16} color={C.success} />
              <Text style={s.resultSectionTitle}>Products ({products.length})</Text>
              <TouchableOpacity style={s.viewAllBtn} onPress={() => openProductDetail(query)} activeOpacity={0.7}>
                <Text style={s.viewAllText}>View cross-business details</Text>
                <ChevronRight size={12} color={C.primary} />
              </TouchableOpacity>
            </View>
            {products.map((p: any) => (
              <TouchableOpacity key={p.id} style={s.resultCard} onPress={() => openProductDetail(p.name)} activeOpacity={0.7}>
                <View style={s.resultCardHead}>
                  <View style={[s.resultIcon, { backgroundColor: C.successBg }]}>
                    <Package size={14} color={C.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>{p.name}</Text>
                    <Text style={s.resultSub}>
                      {p.brand ? p.brand + ' \u00B7 ' : ''}{p.category || 'N/A'} {'\u00B7'} HSN: {p.hsn_code || 'N/A'}
                    </Text>
                    {p.barcode && <Text style={s.resultSub}>Barcode: {p.barcode}</Text>}
                    <Text style={s.resultSub}>Business: {p.businessName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.resultTitle, { color: C.success }]}>Stock: {p.current_stock ?? 'N/A'}</Text>
                    <Text style={s.resultSub}>{fmt(Number(p.sales_price) || 0)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ========== BUSINESS DETAIL VIEW ==========
  const renderBusinessDetail = () => {
    if (!businessDetail) return null;
    const bd = businessDetail;
    const biz = bd.business || {};
    const sum = bd.summary || {};

    return (
      <View>
        {/* Business Header */}
        <View style={s.detailHeader}>
          <View style={[s.detailHeaderIcon, { backgroundColor: C.primaryBg }]}>
            <Building2 size={24} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.detailTitle}>{biz.legal_name || 'Unnamed Business'}</Text>
            <Text style={s.detailSub}>Owner: {biz.owner_name || 'N/A'} {'\u00B7'} {biz.business_type || 'N/A'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <Badge label={biz.is_deleted ? 'Deleted' : 'Active'} color={biz.is_deleted ? C.error : C.success} bg={biz.is_deleted ? C.errorBg : C.successBg} />
              <Badge label={biz.subscription_status || 'none'} color={C.accent} bg={C.accentBg} />
              {biz.is_on_trial && <Badge label="Trial" color={C.warning} bg={C.warningBg} />}
            </View>
          </View>
        </View>

        {/* Summary */}
        <SectionHeader sKey="summary" title="Financial Summary" icon={BarChart3} color={C.primary} bg={C.primaryBg} />
        {expandedSections.summary && (
          <View style={s.sectionContent}>
            <View style={s.summaryGrid}>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total Sales</Text>
                <Text style={[s.summaryValue, { color: C.success }]}>{fmt(sum.totalSales || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total Paid</Text>
                <Text style={[s.summaryValue, { color: C.primary }]}>{fmt(sum.totalPaid || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Receivable</Text>
                <Text style={[s.summaryValue, { color: C.warning }]}>{fmt(sum.totalReceivable || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total Purchases</Text>
                <Text style={[s.summaryValue, { color: C.orange }]}>{fmt(sum.totalPurchases || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Purchase Paid</Text>
                <Text style={[s.summaryValue, { color: C.teal }]}>{fmt(sum.totalPurchasePaid || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Payable</Text>
                <Text style={[s.summaryValue, { color: C.error }]}>{fmt(sum.totalPayable || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Bank Balance</Text>
                <Text style={[s.summaryValue, { color: C.info }]}>{fmt(sum.totalBankBal || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Returns</Text>
                <Text style={[s.summaryValue, { color: C.error }]}>{fmt(sum.totalReturns || 0)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Marketing Spend</Text>
                <Text style={[s.summaryValue, { color: C.accent }]}>{fmt(sum.mktgSpend || 0)}</Text>
              </View>
            </View>
            <View style={s.countsRow}>
              <View style={s.countChip}><MapPin size={12} color={C.primary} /><Text style={s.countText}>{sum.locationCount || 0} Locations</Text></View>
              <View style={s.countChip}><UserCheck size={12} color={C.teal} /><Text style={s.countText}>{sum.staffCount || 0} Staff</Text></View>
              <View style={s.countChip}><Users size={12} color={C.info} /><Text style={s.countText}>{sum.customerCount || 0} Customers</Text></View>
              <View style={s.countChip}><ShoppingCart size={12} color={C.orange} /><Text style={s.countText}>{sum.supplierCount || 0} Suppliers</Text></View>
              <View style={s.countChip}><Package size={12} color={C.success} /><Text style={s.countText}>{sum.productCount || 0} Products</Text></View>
              <View style={s.countChip}><FileText size={12} color={C.info} /><Text style={s.countText}>{sum.invoiceCount || 0} Invoices</Text></View>
              <View style={s.countChip}><ClipboardList size={12} color={C.accent} /><Text style={s.countText}>{sum.poCount || 0} POs</Text></View>
              <View style={s.countChip}><RotateCcw size={12} color={C.error} /><Text style={s.countText}>{sum.returnCount || 0} Returns</Text></View>
            </View>

            <View style={s.bizInfoCard}>
              <InfoRow label="Business ID" value={biz.id} mono />
              <InfoRow label="Tax ID Type" value={biz.tax_id_type} />
              <InfoRow label="Tax ID (GSTIN/PAN)" value={biz.tax_id} />
              <InfoRow label="Phone" value={biz.phone} />
              <InfoRow label="Phone Verified" value={biz.is_phone_verified ? 'Yes' : 'No'} />
              <InfoRow label="Tax ID Verified" value={biz.is_tax_id_verified ? 'Yes' : 'No'} />
              <InfoRow label="Owner DOB" value={fmtDate(biz.owner_dob)} />
              <InfoRow label="Cash Balance" value={fmt(Number(biz.total_cash_balance) || 0)} />
              <InfoRow label="Bank Balance" value={fmt(Number(biz.total_bank_balance) || 0)} />
              <InfoRow label="Total Funds" value={fmt(Number(biz.total_funds) || 0)} />
              <InfoRow label="Subscription Plan" value={biz.subscription_plan_name} />
              <InfoRow label="Subscription Expires" value={fmtDate(biz.subscription_expires_at)} />
              <InfoRow label="Trial Start" value={fmtDate(biz.trial_start_date)} />
              <InfoRow label="Trial End" value={fmtDate(biz.trial_end_date)} />
              <InfoRow label="Created" value={fmtDateTime(biz.created_at)} />
            </View>
          </View>
        )}

        {/* Locations */}
        <SectionHeader sKey="locations" title="Locations / Addresses" icon={MapPin} count={(bd.locations || []).filter((x: any) => !x.is_deleted).length} color={C.warning} bg={C.warningBg} />
        {expandedSections.locations && (
          <View style={s.sectionContent}>
            {(bd.locations || []).filter((x: any) => !x.is_deleted).map((loc: any) => (
              <View key={loc.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{loc.name || 'Unnamed'}</Text>
                  <Badge label={loc.type || 'branch'} color={C.primary} bg={C.primaryBg} />
                  {loc.is_primary && <Badge label="Primary" color={C.success} bg={C.successBg} />}
                </View>
                <Text style={s.itemSub}>
                  {[loc.door_number, loc.address_line_1, loc.address_line_2, loc.address_line_3, loc.city, loc.state, loc.pincode].filter(Boolean).join(', ')}
                </Text>
                {loc.contact_name && <Text style={s.itemSub}>Contact: {loc.contact_name} {'\u00B7'} {loc.contact_phone || ''}</Text>}
              </View>
            ))}
            {(bd.locations || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No locations</Text>}
          </View>
        )}

        {/* Bank Accounts */}
        <SectionHeader sKey="bankAccounts" title="Bank Accounts" icon={CreditCard} count={(bd.bankAccounts || []).filter((x: any) => !x.is_deleted).length} color={C.teal} bg={C.tealBg} />
        {expandedSections.bankAccounts && (
          <View style={s.sectionContent}>
            {(bd.bankAccounts || []).filter((x: any) => !x.is_deleted).map((b: any) => (
              <View key={b.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{b.bank_name || 'Unknown Bank'}</Text>
                  {b.is_primary && <Badge label="Primary" color={C.success} bg={C.successBg} />}
                </View>
                <InfoRow label="Account Number" value={b.account_number} />
                <InfoRow label="IFSC" value={b.ifsc_code} />
                <InfoRow label="Holder Name" value={b.account_holder_name} />
                <InfoRow label="Account Type" value={b.account_type} />
                <InfoRow label="UPI ID" value={b.upi_id} />
                <InfoRow label="Current Balance" value={fmt(Number(b.current_balance) || 0)} />
                <InfoRow label="Initial Balance" value={fmt(Number(b.initial_balance) || 0)} />
              </View>
            ))}
            {(bd.bankAccounts || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No bank accounts</Text>}
          </View>
        )}

        {/* Bank Transactions */}
        <SectionHeader sKey="bankTransactions" title="Bank Transactions" icon={IndianRupee} count={(bd.bankTransactions || []).length} color={C.info} bg={C.infoBg} />
        {expandedSections.bankTransactions && (
          <View style={s.sectionContent}>
            {(bd.bankTransactions || []).slice(0, 50).map((t: any) => (
              <View key={t.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{t.description || t.category || 'Transaction'}</Text>
                  <Badge label={t.type || 'N/A'} color={t.type === 'credit' ? C.success : C.error} bg={t.type === 'credit' ? C.successBg : C.errorBg} />
                </View>
                <Text style={[s.amountText, { color: t.type === 'credit' ? C.success : C.error }]}>
                  {t.type === 'credit' ? '+' : '-'}{fmt(Number(t.amount) || 0)}
                </Text>
                <Text style={s.itemSub}>
                  {fmtDateTime(t.transaction_date)} {'\u00B7'} {t.payment_mode || ''} {'\u00B7'} {t.counterparty_name || ''}
                </Text>
                {t.reference_number && <Text style={s.itemSub}>Ref: {t.reference_number}</Text>}
              </View>
            ))}
            {(bd.bankTransactions || []).length === 0 && <Text style={s.emptyText}>No transactions</Text>}
          </View>
        )}

        {/* Staff */}
        <SectionHeader sKey="staff" title="Staff" icon={UserCheck} count={(bd.staff || []).filter((x: any) => !x.is_deleted).length} color={C.teal} bg={C.tealBg} />
        {expandedSections.staff && (
          <View style={s.sectionContent}>
            {(bd.staff || []).filter((x: any) => !x.is_deleted).map((st: any) => (
              <View key={st.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{st.name}</Text>
                  <Badge label={st.role || 'staff'} color={C.primary} bg={C.primaryBg} />
                  <Badge label={st.status || 'active'} color={st.status === 'inactive' ? C.error : C.success} bg={st.status === 'inactive' ? C.errorBg : C.successBg} />
                </View>
                <InfoRow label="Mobile" value={st.mobile} />
                <InfoRow label="Email" value={st.email} />
                <InfoRow label="Department" value={st.department} />
                <InfoRow label="Employee ID" value={st.employee_id} />
                <InfoRow label="Location" value={st.location_name} />
                <InfoRow label="Basic Salary" value={st.basic_salary ? fmt(Number(st.basic_salary)) : 'N/A'} />
                <InfoRow label="Allowances" value={st.allowances ? fmt(Number(st.allowances)) : 'N/A'} />
                <InfoRow label="Sales Target" value={st.monthly_sales_target ? fmt(Number(st.monthly_sales_target)) : 'N/A'} />
                <InfoRow label="Join Date" value={fmtDate(st.join_date)} />
                {st.emergency_contact_name && (
                  <InfoRow label="Emergency Contact" value={`${st.emergency_contact_name} (${st.emergency_contact_relation || ''}) - ${st.emergency_contact_phone || ''}`} />
                )}
              </View>
            ))}
            {(bd.staff || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No staff</Text>}
          </View>
        )}

        {/* Customers */}
        <SectionHeader sKey="customers" title="Customers" icon={Users} count={(bd.customers || []).filter((x: any) => !x.is_deleted).length} color={C.info} bg={C.infoBg} />
        {expandedSections.customers && (
          <View style={s.sectionContent}>
            {(bd.customers || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((c: any) => (
              <View key={c.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{c.name || c.business_name || 'Unnamed'}</Text>
                  <Badge label={c.customer_type || 'retail'} color={C.info} bg={C.infoBg} />
                </View>
                <InfoRow label="Mobile" value={c.mobile} />
                <InfoRow label="Email" value={c.email} />
                <InfoRow label="GSTIN" value={c.gstin} />
                <InfoRow label="Address" value={c.address} />
                <InfoRow label="Credit Limit" value={c.credit_limit ? fmt(Number(c.credit_limit)) : 'N/A'} />
                <InfoRow label="Payment Terms" value={c.payment_terms} />
              </View>
            ))}
            {(bd.customers || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No customers</Text>}
          </View>
        )}

        {/* Suppliers */}
        <SectionHeader sKey="suppliers" title="Suppliers" icon={ShoppingCart} count={(bd.suppliers || []).filter((x: any) => !x.is_deleted).length} color={C.orange} bg={C.orangeBg} />
        {expandedSections.suppliers && (
          <View style={s.sectionContent}>
            {(bd.suppliers || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((sp: any) => (
              <View key={sp.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{sp.business_name || sp.contact_person || 'Unnamed'}</Text>
                  <Badge label={sp.supplier_type || 'supplier'} color={C.orange} bg={C.orangeBg} />
                </View>
                <InfoRow label="Contact Person" value={sp.contact_person} />
                <InfoRow label="Mobile" value={sp.mobile_number} />
                <InfoRow label="Email" value={sp.email} />
                <InfoRow label="GSTIN/PAN" value={sp.gstin_pan} />
                <InfoRow label="Address" value={[sp.address_line_1, sp.address_line_2, sp.city, sp.state, sp.pincode].filter(Boolean).join(', ')} />
              </View>
            ))}
            {(bd.suppliers || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No suppliers</Text>}
          </View>
        )}

        {/* Products */}
        <SectionHeader sKey="products" title="Products" icon={Package} count={(bd.products || []).filter((x: any) => !x.is_deleted).length} color={C.success} bg={C.successBg} />
        {expandedSections.products && (
          <View style={s.sectionContent}>
            {(bd.products || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((p: any) => (
              <View key={p.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{p.name}</Text>
                  {p.current_stock !== null && p.min_stock_level !== null && Number(p.current_stock) <= Number(p.min_stock_level) && (
                    <Badge label="Low Stock" color={C.error} bg={C.errorBg} />
                  )}
                </View>
                <InfoRow label="Category" value={p.category} />
                <InfoRow label="Brand" value={p.brand} />
                <InfoRow label="HSN Code" value={p.hsn_code} />
                <InfoRow label="Barcode" value={p.barcode} />
                <InfoRow label="Current Stock" value={`${p.current_stock ?? 'N/A'} ${p.primary_unit || ''}`} />
                <InfoRow label="Min Stock" value={p.min_stock_level} />
                <InfoRow label="Purchase Price" value={p.purchase_price ? fmt(Number(p.purchase_price)) : 'N/A'} />
                <InfoRow label="Sales Price" value={p.sales_price ? fmt(Number(p.sales_price)) : 'N/A'} />
                <InfoRow label="MRP" value={p.mrp_price ? fmt(Number(p.mrp_price)) : 'N/A'} />
                <InfoRow label="Stock Value" value={p.stock_value ? fmt(Number(p.stock_value)) : 'N/A'} />
                <InfoRow label="Tax Rate" value={p.tax_rate ? `${p.tax_rate}%` : 'N/A'} />
              </View>
            ))}
            {(bd.products || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No products</Text>}
          </View>
        )}

        {/* Invoices (Sales) */}
        <SectionHeader sKey="invoices" title="Sales Invoices" icon={FileText} count={(bd.invoices || []).filter((x: any) => !x.is_deleted).length} color={C.info} bg={C.infoBg} />
        {expandedSections.invoices && (
          <View style={s.sectionContent}>
            {(bd.invoices || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((inv: any) => {
              const items = (bd.invoiceItems || []).filter((it: any) => it.invoice_id === inv.id && !it.is_deleted);
              return (
                <View key={inv.id} style={s.itemCard}>
                  <View style={s.itemCardHead}>
                    <Text style={s.itemTitle}>{inv.invoice_number || 'N/A'}</Text>
                    <Badge
                      label={inv.payment_status || 'unknown'}
                      color={inv.payment_status === 'paid' ? C.success : inv.payment_status === 'partial' ? C.warning : C.error}
                      bg={inv.payment_status === 'paid' ? C.successBg : inv.payment_status === 'partial' ? C.warningBg : C.errorBg}
                    />
                  </View>
                  <InfoRow label="Customer" value={inv.customer_name || 'Walk-in'} />
                  <InfoRow label="Date" value={fmtDate(inv.invoice_date)} />
                  <InfoRow label="Total" value={fmt(Number(inv.total_amount) || 0)} />
                  <InfoRow label="Paid" value={fmt(Number(inv.paid_amount) || 0)} />
                  <InfoRow label="Balance" value={fmt(Number(inv.balance_amount) || 0)} />
                  <InfoRow label="Payment Method" value={inv.payment_method} />
                  <InfoRow label="Staff" value={inv.staff_name} />
                  {items.length > 0 && (
                    <View style={s.nestedItems}>
                      <Text style={s.nestedTitle}>Items ({items.length})</Text>
                      {items.map((it: any) => (
                        <Text key={it.id} style={s.nestedItem}>
                          {it.product_name || 'N/A'} {'\u00D7'} {it.quantity} @ {fmt(Number(it.unit_price) || 0)} = {fmt(Number(it.total_price) || 0)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {(bd.invoices || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No invoices</Text>}
          </View>
        )}

        {/* Purchase Orders */}
        <SectionHeader sKey="purchaseOrders" title="Purchase Orders" icon={ClipboardList} count={(bd.purchaseOrders || []).filter((x: any) => !x.is_deleted).length} color={C.accent} bg={C.accentBg} />
        {expandedSections.purchaseOrders && (
          <View style={s.sectionContent}>
            {(bd.purchaseOrders || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((po: any) => {
              const items = (bd.purchaseOrderItems || []).filter((it: any) => it.purchase_order_id === po.id && !it.is_deleted);
              return (
                <View key={po.id} style={s.itemCard}>
                  <View style={s.itemCardHead}>
                    <Text style={s.itemTitle}>{po.po_number || 'N/A'}</Text>
                    <Badge label={po.status || 'unknown'} color={C.accent} bg={C.accentBg} />
                  </View>
                  <InfoRow label="Supplier" value={po.supplier_name} />
                  <InfoRow label="Order Date" value={fmtDate(po.order_date)} />
                  <InfoRow label="Total" value={fmt(Number(po.total_amount) || 0)} />
                  <InfoRow label="Expected Delivery" value={fmtDate(po.expected_delivery)} />
                  <InfoRow label="Staff" value={po.staff_name} />
                  {items.length > 0 && (
                    <View style={s.nestedItems}>
                      <Text style={s.nestedTitle}>Items ({items.length})</Text>
                      {items.map((it: any) => (
                        <Text key={it.id} style={s.nestedItem}>
                          {it.product_name || 'N/A'} {'\u00D7'} {it.quantity} @ {fmt(Number(it.unit_price) || 0)} = {fmt(Number(it.total_price) || 0)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {(bd.purchaseOrders || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No purchase orders</Text>}
          </View>
        )}

        {/* Purchase Invoices */}
        <SectionHeader sKey="purchaseInvoices" title="Purchase Invoices" icon={Truck} count={(bd.purchaseInvoices || []).filter((x: any) => !x.is_deleted).length} color={C.orange} bg={C.orangeBg} />
        {expandedSections.purchaseInvoices && (
          <View style={s.sectionContent}>
            {(bd.purchaseInvoices || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((pi: any) => {
              const items = (bd.purchaseInvoiceItems || []).filter((it: any) => it.purchase_invoice_id === pi.id && !it.is_deleted);
              return (
                <View key={pi.id} style={s.itemCard}>
                  <View style={s.itemCardHead}>
                    <Text style={s.itemTitle}>{pi.invoice_number || 'N/A'}</Text>
                    <Badge
                      label={pi.payment_status || 'unknown'}
                      color={pi.payment_status === 'paid' ? C.success : C.warning}
                      bg={pi.payment_status === 'paid' ? C.successBg : C.warningBg}
                    />
                  </View>
                  <InfoRow label="Supplier" value={pi.supplier_name} />
                  <InfoRow label="PO Number" value={pi.po_number} />
                  <InfoRow label="Date" value={fmtDate(pi.invoice_date)} />
                  <InfoRow label="Total" value={fmt(Number(pi.total_amount) || 0)} />
                  <InfoRow label="Paid" value={fmt(Number(pi.paid_amount) || 0)} />
                  <InfoRow label="Balance" value={fmt(Number(pi.balance_amount) || 0)} />
                  <InfoRow label="Delivery Status" value={pi.delivery_status} />
                  {items.length > 0 && (
                    <View style={s.nestedItems}>
                      <Text style={s.nestedTitle}>Items ({items.length})</Text>
                      {items.map((it: any) => (
                        <Text key={it.id} style={s.nestedItem}>
                          {it.product_name || 'N/A'} {'\u00D7'} {it.quantity} @ {fmt(Number(it.unit_price) || 0)} = {fmt(Number(it.total_price) || 0)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {(bd.purchaseInvoices || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No purchase invoices</Text>}
          </View>
        )}

        {/* Returns */}
        <SectionHeader sKey="returns" title="Returns" icon={RotateCcw} count={(bd.returns || []).filter((x: any) => !x.is_deleted).length} color={C.error} bg={C.errorBg} />
        {expandedSections.returns && (
          <View style={s.sectionContent}>
            {(bd.returns || []).filter((x: any) => !x.is_deleted).slice(0, 50).map((ret: any) => {
              const items = (bd.returnItems || []).filter((it: any) => it.return_id === ret.id && !it.is_deleted);
              return (
                <View key={ret.id} style={s.itemCard}>
                  <View style={s.itemCardHead}>
                    <Text style={s.itemTitle}>{ret.return_number || 'N/A'}</Text>
                    <Badge label={ret.refund_status || 'pending'} color={ret.refund_status === 'completed' ? C.success : C.warning} bg={ret.refund_status === 'completed' ? C.successBg : C.warningBg} />
                  </View>
                  <InfoRow label="Customer" value={ret.customer_name} />
                  <InfoRow label="Original Invoice" value={ret.original_invoice_number} />
                  <InfoRow label="Date" value={fmtDate(ret.return_date)} />
                  <InfoRow label="Total" value={fmt(Number(ret.total_amount) || 0)} />
                  <InfoRow label="Refund Amount" value={fmt(Number(ret.refund_amount) || 0)} />
                  <InfoRow label="Refund Method" value={ret.refund_method} />
                  <InfoRow label="Reason" value={ret.reason} />
                  {items.length > 0 && (
                    <View style={s.nestedItems}>
                      <Text style={s.nestedTitle}>Items ({items.length})</Text>
                      {items.map((it: any) => (
                        <Text key={it.id} style={s.nestedItem}>
                          {it.product_name || 'N/A'} {'\u00D7'} {it.quantity} = {fmt(Number(it.total_price) || 0)} - {it.reason || ''}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {(bd.returns || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No returns</Text>}
          </View>
        )}

        {/* Subscriptions */}
        <SectionHeader sKey="subscriptions" title="Subscriptions" icon={Shield} count={(bd.subscriptions || []).length} color={C.accent} bg={C.accentBg} />
        {expandedSections.subscriptions && (
          <View style={s.sectionContent}>
            {(bd.subscriptions || []).map((sub: any) => (
              <View key={sub.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>Subscription</Text>
                  <Badge label={sub.status || 'unknown'} color={sub.status === 'active' ? C.success : C.warning} bg={sub.status === 'active' ? C.successBg : C.warningBg} />
                  {sub.is_on_trial && <Badge label="Trial" color={C.info} bg={C.infoBg} />}
                </View>
                <InfoRow label="Period Start" value={fmtDate(sub.current_period_start)} />
                <InfoRow label="Period End" value={fmtDate(sub.current_period_end)} />
                <InfoRow label="Trial Start" value={fmtDate(sub.trial_start_date)} />
                <InfoRow label="Trial End" value={fmtDate(sub.trial_end_date)} />
                <InfoRow label="Cancel at End" value={sub.cancel_at_period_end ? 'Yes' : 'No'} />
              </View>
            ))}

            {(bd.subscriptionHistory || []).length > 0 && (
              <>
                <Text style={s.subSectionTitle}>Subscription History</Text>
                {(bd.subscriptionHistory || []).map((h: any) => (
                  <View key={h.id} style={s.itemCard}>
                    <View style={s.itemCardHead}>
                      <Text style={s.itemTitle}>{h.action || 'N/A'}</Text>
                    </View>
                    <InfoRow label="Old Status" value={h.old_status} />
                    <InfoRow label="New Status" value={h.new_status} />
                    <InfoRow label="Description" value={h.description} />
                    <InfoRow label="Date" value={fmtDateTime(h.created_at)} />
                  </View>
                ))}
              </>
            )}

            {(bd.subscriptionAddons || []).length > 0 && (
              <>
                <Text style={s.subSectionTitle}>Add-ons</Text>
                {(bd.subscriptionAddons || []).map((a: any) => (
                  <View key={a.id} style={s.itemCard}>
                    <InfoRow label="Type" value={a.addon_type} />
                    <InfoRow label="Quantity" value={a.quantity} />
                    <InfoRow label="Price" value={a.price ? fmt(Number(a.price)) : 'N/A'} />
                    <InfoRow label="Billing" value={a.billing_period} />
                    <InfoRow label="Active" value={a.is_active ? 'Yes' : 'No'} />
                  </View>
                ))}
              </>
            )}
            {(bd.subscriptions || []).length === 0 && <Text style={s.emptyText}>No subscriptions</Text>}
          </View>
        )}

        {/* Marketing */}
        <SectionHeader sKey="marketing" title="Marketing Campaigns" icon={Megaphone} count={(bd.marketingCampaigns || []).filter((x: any) => !x.is_deleted).length} color={C.accent} bg={C.accentBg} />
        {expandedSections.marketing && (
          <View style={s.sectionContent}>
            {(bd.marketingCampaigns || []).filter((x: any) => !x.is_deleted).map((m: any) => (
              <View key={m.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{m.name || 'Unnamed'}</Text>
                  <Badge label={m.status || 'draft'} color={m.status === 'active' ? C.success : C.textMuted} bg={m.status === 'active' ? C.successBg : C.bg} />
                </View>
                <InfoRow label="Platform" value={m.platform} />
                <InfoRow label="Objective" value={m.objective} />
                <InfoRow label="Budget" value={m.budget ? fmt(Number(m.budget)) : 'N/A'} />
                <InfoRow label="Spend" value={m.spend ? fmt(Number(m.spend)) : 'N/A'} />
                <InfoRow label="Start" value={fmtDate(m.start_date)} />
                <InfoRow label="End" value={fmtDate(m.end_date)} />
                <InfoRow label="Impressions" value={m.impressions} />
                <InfoRow label="Clicks" value={m.clicks} />
                <InfoRow label="Conversions" value={m.conversions} />
              </View>
            ))}
            {(bd.marketingCampaigns || []).filter((x: any) => !x.is_deleted).length === 0 && <Text style={s.emptyText}>No campaigns</Text>}
          </View>
        )}

        {/* Settings */}
        <SectionHeader sKey="settings" title="Business Settings" icon={Settings} color={C.textSecondary} bg={C.bg} />
        {expandedSections.settings && (
          <View style={s.sectionContent}>
            {bd.settings ? (
              <View style={s.itemCard}>
                <InfoRow label="Financial Year" value={bd.settings.financial_year_format} />
                <InfoRow label="Invoice Prefix" value={bd.settings.invoice_prefix} />
                <InfoRow label="Starting Invoice #" value={bd.settings.starting_invoice_number} />
                <InfoRow label="Last Invoice #" value={bd.settings.last_invoice_number} />
                <InfoRow label="Initial Cash" value={bd.settings.initial_cash_balance ? fmt(Number(bd.settings.initial_cash_balance)) : 'N/A'} />
                <InfoRow label="Current Cash" value={bd.settings.current_cash_balance ? fmt(Number(bd.settings.current_cash_balance)) : 'N/A'} />
              </View>
            ) : (
              <Text style={s.emptyText}>No settings configured</Text>
            )}
          </View>
        )}

        {/* Inventory Logs */}
        <SectionHeader sKey="inventoryLogs" title="Inventory Logs" icon={History} count={(bd.inventoryLogs || []).length} color={C.warning} bg={C.warningBg} />
        {expandedSections.inventoryLogs && (
          <View style={s.sectionContent}>
            {(bd.inventoryLogs || []).slice(0, 50).map((log: any) => (
              <View key={log.id} style={s.itemCard}>
                <View style={s.itemCardHead}>
                  <Text style={s.itemTitle}>{log.transaction_type || 'N/A'}</Text>
                  <Badge
                    label={Number(log.quantity_change) >= 0 ? `+${log.quantity_change}` : String(log.quantity_change)}
                    color={Number(log.quantity_change) >= 0 ? C.success : C.error}
                    bg={Number(log.quantity_change) >= 0 ? C.successBg : C.errorBg}
                  />
                </View>
                <InfoRow label="Reference" value={`${log.reference_type || ''} ${log.reference_number || ''}`} />
                <InfoRow label="Balance After" value={log.balance_after} />
                <InfoRow label="Location" value={log.location_name} />
                <InfoRow label="Staff" value={log.staff_name} />
                {log.customer_name && <InfoRow label="Customer" value={log.customer_name} />}
                {log.supplier_name && <InfoRow label="Supplier" value={log.supplier_name} />}
                <InfoRow label="Date" value={fmtDateTime(log.created_at)} />
              </View>
            ))}
            {(bd.inventoryLogs || []).length === 0 && <Text style={s.emptyText}>No inventory logs</Text>}
          </View>
        )}
      </View>
    );
  };

  // ========== PRODUCT DETAIL VIEW ==========
  const renderProductDetail = () => {
    if (!productDetail) return null;
    const prods = productDetail.products || [];

    if (prods.length === 0) {
      return (
        <View style={s.emptyState}>
          <Package size={48} color={C.textMuted} />
          <Text style={s.emptyTitle}>No products found</Text>
          <Text style={s.emptySub}>Try a different search term</Text>
        </View>
      );
    }

    const bizGroups = new Map<string, any[]>();
    for (const p of prods) {
      const key = p.business_id;
      if (!bizGroups.has(key)) bizGroups.set(key, []);
      bizGroups.get(key)!.push(p);
    }

    const totalStockAcross = prods.reduce((s: number, p: any) => s + (Number(p.current_stock) || 0), 0);
    const totalStockValue = prods.reduce((s: number, p: any) => s + (Number(p.stock_value) || 0), 0);

    return (
      <View>
        <View style={s.detailHeader}>
          <View style={[s.detailHeaderIcon, { backgroundColor: C.successBg }]}>
            <Package size={24} color={C.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.detailTitle}>Product Search: "{query}"</Text>
            <Text style={s.detailSub}>{prods.length} products across {bizGroups.size} businesses</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <Badge label={`Total Stock: ${totalStockAcross}`} color={C.success} bg={C.successBg} />
              <Badge label={`Value: ${fmt(totalStockValue)}`} color={C.primary} bg={C.primaryBg} />
            </View>
          </View>
        </View>

        {prods.map((p: any) => {
          const expanded = expandedProducts[p.id];
          const perf = p.performance || {};
          return (
            <View key={p.id} style={s.productCard}>
              <TouchableOpacity style={s.productCardHead} onPress={() => toggleProduct(p.id)} activeOpacity={0.7}>
                <View style={[s.resultIcon, { backgroundColor: C.successBg }]}>
                  <Package size={14} color={C.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultTitle}>{p.name}</Text>
                  <Text style={s.resultSub}>{p.businessName || 'Unknown Business'} {'\u00B7'} {p.brand || ''} {'\u00B7'} {p.category || ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.resultTitle, { color: Number(p.current_stock) <= Number(p.min_stock_level || 0) ? C.error : C.success }]}>
                    Stock: {p.current_stock ?? 'N/A'} {p.primary_unit || ''}
                  </Text>
                  <Text style={s.resultSub}>{fmt(Number(p.sales_price) || 0)}</Text>
                </View>
                {expanded ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </TouchableOpacity>

              {expanded && (
                <View style={s.productExpanded}>
                  {/* Product Info */}
                  <View style={s.productSection}>
                    <Text style={s.productSectionTitle}>Product Details</Text>
                    <InfoRow label="Barcode" value={p.barcode} />
                    <InfoRow label="HSN Code" value={p.hsn_code} />
                    <InfoRow label="Category" value={p.category} />
                    <InfoRow label="Brand" value={p.brand} />
                    <InfoRow label="Purchase Price" value={p.purchase_price ? fmt(Number(p.purchase_price)) : 'N/A'} />
                    <InfoRow label="Sales Price" value={p.sales_price ? fmt(Number(p.sales_price)) : 'N/A'} />
                    <InfoRow label="MRP" value={p.mrp_price ? fmt(Number(p.mrp_price)) : 'N/A'} />
                    <InfoRow label="Tax Rate" value={p.tax_rate ? `${p.tax_rate}%` : 'N/A'} />
                    <InfoRow label="Min Stock Level" value={p.min_stock_level} />
                    <InfoRow label="Max Stock Level" value={p.max_stock_level} />
                    <InfoRow label="Stock Value" value={p.stock_value ? fmt(Number(p.stock_value)) : 'N/A'} />
                    <InfoRow label="Unit" value={p.primary_unit} />
                    <InfoRow label="Last Restocked" value={fmtDate(p.last_restocked_at)} />
                  </View>

                  {/* Business Info */}
                  <View style={s.productSection}>
                    <Text style={s.productSectionTitle}>Business</Text>
                    <InfoRow label="Business" value={p.businessName} />
                    <InfoRow label="Type" value={p.businessType} />
                    <InfoRow label="Owner" value={p.ownerName} />
                    <InfoRow label="Tax ID" value={p.businessTaxId} />
                  </View>

                  {/* Performance */}
                  <View style={s.productSection}>
                    <Text style={s.productSectionTitle}>Performance</Text>
                    <View style={s.perfGrid}>
                      <View style={s.perfCard}>
                        <Text style={s.perfLabel}>Total Sold</Text>
                        <Text style={[s.perfValue, { color: C.success }]}>{perf.totalSold || 0}</Text>
                      </View>
                      <View style={s.perfCard}>
                        <Text style={s.perfLabel}>Total Purchased</Text>
                        <Text style={[s.perfValue, { color: C.info }]}>{perf.totalPurchased || 0}</Text>
                      </View>
                      <View style={s.perfCard}>
                        <Text style={s.perfLabel}>Sales Value</Text>
                        <Text style={[s.perfValue, { color: C.success }]}>{fmt(perf.totalSalesValue || 0)}</Text>
                      </View>
                      <View style={s.perfCard}>
                        <Text style={s.perfLabel}>Purchase Value</Text>
                        <Text style={[s.perfValue, { color: C.orange }]}>{fmt(perf.totalPurchaseValue || 0)}</Text>
                      </View>
                      <View style={s.perfCard}>
                        <Text style={s.perfLabel}>Margin</Text>
                        <Text style={[s.perfValue, { color: (perf.margin || 0) >= 0 ? C.success : C.error }]}>{fmt(perf.margin || 0)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Stock */}
                  {(p.locationStock || []).length > 0 && (
                    <View style={s.productSection}>
                      <Text style={s.productSectionTitle}>Stock by Location</Text>
                      {p.locationStock.map((ls: any, i: number) => (
                        <View key={i} style={s.stockRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.itemTitle}>{ls.locationName || 'Unknown'}</Text>
                            <Text style={s.itemSub}>{ls.locationType || ''} {'\u00B7'} {ls.locationCity || ''}</Text>
                          </View>
                          <Text style={[s.stockQty, { color: Number(ls.quantity) > 0 ? C.success : C.error }]}>
                            {ls.quantity} {p.primary_unit || ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Supplier */}
                  {p.supplier && (
                    <View style={s.productSection}>
                      <Text style={s.productSectionTitle}>Preferred Supplier</Text>
                      <InfoRow label="Name" value={p.supplier.business_name || p.supplier.contact_person} />
                      <InfoRow label="Contact" value={p.supplier.contact_person} />
                      <InfoRow label="Mobile" value={p.supplier.mobile_number} />
                      <InfoRow label="Email" value={p.supplier.email} />
                      <InfoRow label="GSTIN/PAN" value={p.supplier.gstin_pan} />
                      <InfoRow label="Location" value={[p.supplier.city, p.supplier.state].filter(Boolean).join(', ')} />
                    </View>
                  )}

                  {/* Recent Sales */}
                  {(p.recentSales || []).length > 0 && (
                    <View style={s.productSection}>
                      <Text style={s.productSectionTitle}>Recent Sales ({p.recentSales.length})</Text>
                      {p.recentSales.map((sale: any, i: number) => (
                        <View key={i} style={s.txnRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.txnTitle}>{sale.invoiceNumber || 'N/A'}</Text>
                            <Text style={s.txnSub}>Customer: {sale.customerName || 'Walk-in'} {'\u00B7'} {fmtDate(sale.invoiceDate)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={s.txnQty}>{sale.quantity} {'\u00D7'} {fmt(Number(sale.unit_price) || 0)}</Text>
                            <Text style={[s.txnTotal, { color: C.success }]}>{fmt(Number(sale.total_price) || 0)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Recent Purchases */}
                  {(p.recentPurchases || []).length > 0 && (
                    <View style={s.productSection}>
                      <Text style={s.productSectionTitle}>Recent Purchases ({p.recentPurchases.length})</Text>
                      {p.recentPurchases.map((pur: any, i: number) => (
                        <View key={i} style={s.txnRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.txnTitle}>{pur.invoiceNumber || 'N/A'}</Text>
                            <Text style={s.txnSub}>Supplier: {pur.supplierName || 'N/A'} {'\u00B7'} {fmtDate(pur.invoiceDate)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={s.txnQty}>{pur.quantity} {'\u00D7'} {fmt(Number(pur.unit_price) || 0)}</Text>
                            <Text style={[s.txnTotal, { color: C.orange }]}>{fmt(Number(pur.total_price) || 0)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Recent Inventory Logs */}
                  {(p.recentLogs || []).length > 0 && (
                    <View style={s.productSection}>
                      <Text style={s.productSectionTitle}>Recent Inventory Activity ({p.recentLogs.length})</Text>
                      {p.recentLogs.map((log: any, i: number) => (
                        <View key={i} style={s.txnRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.txnTitle}>{log.transaction_type} {'\u00B7'} {log.reference_type || ''}</Text>
                            <Text style={s.txnSub}>
                              {log.customer_name || log.supplier_name || ''} {'\u00B7'} {fmtDate(log.created_at)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Badge
                              label={Number(log.quantity_change) >= 0 ? `+${log.quantity_change}` : String(log.quantity_change)}
                              color={Number(log.quantity_change) >= 0 ? C.success : C.error}
                              bg={Number(log.quantity_change) >= 0 ? C.successBg : C.errorBg}
                            />
                            <Text style={s.txnSub}>Bal: {log.balance_after}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const headerTitle = viewMode === 'business_detail' ? 'Business Detail' : viewMode === 'product_detail' ? 'Product Intelligence' : 'Search';

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Shield size={16} color={C.primary} />
        <Text style={s.headerTitle}>{headerTitle}</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchBar}>
        <View style={s.searchInputWrap}>
          <Search size={18} color={C.textMuted} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Search business, GSTIN, PAN, owner, staff, invoice, PO, product, barcode, city, pincode, address..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={onChangeText}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchResults(null); setViewMode('search'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, maxWidth: isDesktop ? 1200 : undefined, alignSelf: isDesktop ? 'center' : undefined, width: isDesktop ? '100%' : undefined }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>
              {viewMode === 'business_detail' ? 'Loading business data...' : viewMode === 'product_detail' ? 'Analyzing products...' : 'Searching...'}
            </Text>
          </View>
        )}

        {error ? (
          <View style={s.errorWrap}>
            <AlertTriangle size={24} color={C.error} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')} style={s.dismissBtn}>
              <Text style={s.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && viewMode === 'search' && !searchResults && (
          <View style={s.emptyState}>
            <Search size={56} color={C.textMuted} />
            <Text style={s.emptyTitle}>Search Everything</Text>
            <Text style={s.emptySub}>
              Search by business name, GSTIN, PAN, owner name, staff name, invoice number, PO number, product name, or barcode
            </Text>
          </View>
        )}

        {!loading && viewMode === 'search' && renderSearchResults()}
        {!loading && viewMode === 'business_detail' && renderBusinessDetail()}
        {!loading && viewMode === 'product_detail' && renderProductDetail()}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text, flex: 1 },

  searchBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.border },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: Platform.OS === 'ios' ? 12 : 10, ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }) },

  loadingWrap: { alignItems: 'center', paddingTop: 60 },
  loadingText: { color: C.textSecondary, fontSize: 14, marginTop: 12 },

  errorWrap: { backgroundColor: C.errorBg, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  errorText: { color: C.error, fontSize: 13, textAlign: 'center' },
  dismissBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: C.error, borderRadius: 6 },
  dismissText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 16 },
  emptySub: { fontSize: 13, color: C.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  resultCount: { fontSize: 13, color: C.textSecondary, marginBottom: 16, fontWeight: '600' },

  resultSection: { marginBottom: 20 },
  resultSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  resultSectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.primaryBg, borderRadius: 6 },
  viewAllText: { fontSize: 11, color: C.primary, fontWeight: '600' },

  resultCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  resultCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  resultTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  resultSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  resultMeta: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.bg, flexDirection: 'row', gap: 16 },
  resultMetaText: { fontSize: 11, color: C.textMuted },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Detail views
  detailHeader: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  detailHeaderIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  detailTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  detailSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 2, borderWidth: 1, borderColor: C.border },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  sectionContent: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: { backgroundColor: C.bg, borderRadius: 8, padding: 10, minWidth: 100, flex: 1 },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: C.textMuted, marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '800' },

  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 8 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  countText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  bizInfoCard: { backgroundColor: C.bg, borderRadius: 8, padding: 10, marginTop: 8 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 11, color: C.text, fontWeight: '600', flex: 2, textAlign: 'right' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 },

  itemCard: { backgroundColor: C.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
  itemCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  itemTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  itemSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  amountText: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  emptyText: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  nestedItems: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  nestedTitle: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 4 },
  nestedItem: { fontSize: 11, color: C.text, paddingVertical: 2 },

  subSectionTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 12, marginBottom: 6 },

  // Product detail
  productCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  productCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  productExpanded: { padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: C.border },
  productSection: { marginBottom: 12 },
  productSectionTitle: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border },

  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  perfCard: { backgroundColor: C.bg, borderRadius: 8, padding: 8, minWidth: 90, flex: 1 },
  perfLabel: { fontSize: 9, fontWeight: '600', color: C.textMuted },
  perfValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  stockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stockQty: { fontSize: 14, fontWeight: '800' },

  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  txnTitle: { fontSize: 12, fontWeight: '600', color: C.text },
  txnSub: { fontSize: 10, color: C.textSecondary, marginTop: 1 },
  txnQty: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },
  txnTotal: { fontSize: 13, fontWeight: '700' },
});
