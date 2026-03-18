import React, { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Platform,
  BackHandler,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated as RNAnimated,
  Share,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';
import { 
  Menu, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  RotateCcw, 
  Package, 
  CreditCard, 
  IndianRupee, 
  Bell, 
  Users, 
  TriangleAlert as AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CircleAlert as AlertCircle,
  ChevronDown,
  ChevronUp,
  PackageMinus,
  PackagePlus,
  Trash2,
  MapPin,
  Camera,
  Power,
  MessageSquare,
  Copy,
  Share2,
  KeyRound,
  X,
  CalendarDays,
  Check,
  CircleX,
} from 'lucide-react-native';
import HamburgerMenu from '@/components/HamburgerMenu';
import FAB from '@/components/FAB';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { usePathname } from 'expo-router';
import { getProducts, getWriteOffs, invalidateApiCache, createStaffSession, endStaffSession, getActiveStaffSession, getInAppNotifications, markNotificationRead, getStaff as getStaffList, getTotalUnreadChatCount, getInvoices, getReturns, getReceivables, getPayables, getPurchaseOrders, createLeaveRequest, getLeaveRequests, updateLeaveRequest, withdrawLeaveRequest, createInAppNotification } from '@/services/backendApi';
import { usePermissions } from '@/contexts/PermissionContext';
import {
  requestLocationPermissions,
  getCurrentPosition,
  getStaffAssignedCoordinates,
  isWithinGeofence,
  calculateDistance,
  startBackgroundLocationMonitoring,
  stopBackgroundLocationMonitoring,
  setActiveSession,
  getStaffAttendanceConfig,
} from '@/utils/geofenceService';
import { supabase } from '@/lib/supabase';
import { onTransactionChange } from '@/utils/transactionEvents';
import { formatCurrencyINR, formatIndianNumber } from '@/utils/formatters';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#4F46E5',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  orange: '#EA580C',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

// Platform-specific shadow utilities
const getShadowStyle = (elevation: number = 2) => ({
  shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
  shadowOffset: Platform.OS === 'ios' ? { width: 0, height: elevation } : undefined,
  shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
  shadowRadius: Platform.OS === 'ios' ? elevation * 2 : undefined,
  elevation: Platform.OS === 'android' ? elevation : undefined,
});

// Platform-specific font utilities
const getFontStyles = () => ({
  header: {
    fontSize: Platform.OS === 'ios' ? 18 : 18,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 16 : 16,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  body: {
    fontSize: Platform.OS === 'ios' ? 14 : 14,
    fontWeight: '500' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  caption: {
    fontSize: Platform.OS === 'ios' ? 12 : 12,
    fontWeight: '500' as const,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
});

// Platform-specific touch feedback utilities
const getTouchProps = () => ({
  activeOpacity: 0.7,
  delayPressIn: Platform.OS === 'android' ? 50 : 0,
  delayPressOut: Platform.OS === 'android' ? 50 : 0,
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const [isLastWeekExpanded, setIsLastWeekExpanded] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [nearLowStockCount, setNearLowStockCount] = useState(0);
  const [writeOffSummary, setWriteOffSummary] = useState({ count: 0, totalValue: 0 });
  const [totalSales, setTotalSales] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [weekSales, setWeekSales] = useState(0);
  const [weekOrders, setWeekOrders] = useState(0);
  const [stockDiscrepancies, setStockDiscrepancies] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: businessData, loading: dataLoading, refetch } = useBusinessData();
  const { hasPermission, isOwner, isStaff, refreshPermissions, staffId, staffName, staffLocationId, staffBusinessId } = usePermissions();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [onlineStaff, setOnlineStaff] = useState<any[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [staffLoginAlerts, setStaffLoginAlerts] = useState<any[]>([]);
  const staffOverlayAnim = useRef(new RNAnimated.Value(-200)).current;
  const dismissedAlertIdsRef = useRef<Set<string>>(new Set());
  const [incompleteStaffList, setIncompleteStaffList] = useState<any[]>([]);
  const [showIncompleteStaffBanner, setShowIncompleteStaffBanner] = useState(false);
  const incompleteStaffDismissedRef = useRef(false);

  const [noCodeStaffList, setNoCodeStaffList] = useState<any[]>([]);
  const [showNoCodeBanner, setShowNoCodeBanner] = useState(false);
  const noCodeDismissedRef = useRef(false);
  const [generatingCodeFor, setGeneratingCodeFor] = useState<string | null>(null);

  // Leave management state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [myLeaveRequests, setMyLeaveRequests] = useState<any[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);
  const [showLeaveReviewModal, setShowLeaveReviewModal] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [allLeaveRequests, setAllLeaveRequests] = useState<any[]>([]);
  const [leaveDetailModal, setLeaveDetailModal] = useState<any>(null);

  const [staffOnline, setStaffOnline] = useState(false);
  const [staffToggleLoading, setStaffToggleLoading] = useState(false);
  const [staffDistance, setStaffDistance] = useState<number | null>(null);
  const [staffGeofenceRadius, setStaffGeofenceRadius] = useState<number>(100);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const loadAllKPIData = useCallback(async () => {
    try {
      const { supabase: sb } = await import('@/lib/supabase');
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) return;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const [productsRes, writeOffRes, invoiceRes, returnsRes, receivablesRes, payablesRes, poRes] = await Promise.allSettled([
        getProducts(),
        getWriteOffs('month'),
        getInvoices(),
        getReturns(),
        getReceivables(),
        getPayables(),
        getPurchaseOrders(),
      ]);

      if (productsRes.status === 'fulfilled' && productsRes.value.success && productsRes.value.products) {
        const products = productsRes.value.products;
        let low = 0;
        let nearLow = 0;
        products.forEach((p: any) => {
          const current = p.current_stock ?? p.stock ?? 0;
          const min = p.min_stock_level ?? p.minimum_stock ?? 0;
          if (min > 0) {
            if (current <= min) low++;
            else if (current <= min * 1.2) nearLow++;
          }
        });
        setLowStockCount(low);
        setNearLowStockCount(nearLow);
      }

      if (writeOffRes.status === 'fulfilled' && writeOffRes.value.success && writeOffRes.value.summary) {
        setWriteOffSummary({ count: writeOffRes.value.summary.count || 0, totalValue: writeOffRes.value.summary.totalValue || 0 });
      }

      if (invoiceRes.status === 'fulfilled' && invoiceRes.value.success && invoiceRes.value.invoices) {
        const invoices = invoiceRes.value.invoices;
        const monthTotal = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || Number(inv.total) || 0), 0);
        setTotalSales(monthTotal);

        let tSales = 0, tOrders = 0, wSales = 0, wOrders = 0;
        invoices.forEach((inv: any) => {
          const amt = Number(inv.total_amount) || Number(inv.total) || 0;
          const invDate = (inv.created_at || inv.invoice_date || '').split('T')[0];
          if (invDate === todayStr) { tSales += amt; tOrders++; }
          if (invDate >= weekAgoStr) { wSales += amt; wOrders++; }
        });
        setTodaySales(tSales);
        setTodayOrders(tOrders);
        setWeekSales(wSales);
        setWeekOrders(wOrders);
      }

      if (returnsRes.status === 'fulfilled' && returnsRes.value.success && returnsRes.value.returns) {
        const total = returnsRes.value.returns.reduce((sum: number, r: any) => sum + (Number(r.refund_amount) || Number(r.total_amount) || Number(r.total) || 0), 0);
        setTotalReturns(total);
      }

      if (receivablesRes.status === 'fulfilled' && receivablesRes.value.success) {
        const total = Number(receivablesRes.value.totalAmount) || (receivablesRes.value.receivables || []).reduce((sum: number, r: any) => sum + (Number(r.totalReceivable) || 0), 0);
        setTotalReceivables(total);
      }

      if (payablesRes.status === 'fulfilled' && payablesRes.value.success) {
        const total = Number(payablesRes.value.totalAmount) || (payablesRes.value.payables || []).reduce((sum: number, p: any) => sum + (Number(p.totalPayable) || 0), 0);
        setTotalPayables(total);
      }

      if (poRes.status === 'fulfilled' && poRes.value.success && poRes.value.orders) {
        const discrepancies = poRes.value.orders
          .filter((po: any) => {
            const ordered = po.total_quantity || po.ordered_quantity || 0;
            const received = po.received_quantity || 0;
            return po.status === 'received' && ordered !== received;
          })
          .slice(0, 5)
          .map((po: any) => ({
            id: po.id,
            poNumber: po.po_number || po.order_number || 'N/A',
            supplier: po.supplier_name || 'Unknown',
            ordered: po.total_quantity || po.ordered_quantity || 0,
            received: po.received_quantity || 0,
          }));
        setStockDiscrepancies(discrepancies);
      }
    } catch (err) {
      console.error('KPI data load error:', err);
    }
  }, []);

  useEffect(() => {
    loadAllKPIData();
  }, [loadAllKPIData]);

  // Auto-refresh KPIs when any transaction changes (sale, return, payment, etc.)
  useEffect(() => {
    const unsubscribe = onTransactionChange((source) => {
      invalidateApiCache();
      loadAllKPIData();
      refetch();
    });
    return unsubscribe;
  }, [loadAllKPIData, refetch]);

  // Supabase realtime: listen for invoice/return inserts for cross-device updates
  useEffect(() => {
    const businessId = businessData?.business?.id;
    if (!businessId) return;

    const channel = supabase
      .channel(`dashboard-kpi-${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'invoices', filter: `business_id=eq.${businessId}` },
        () => {
          invalidateApiCache();
          loadAllKPIData();
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'return_invoices', filter: `business_id=eq.${businessId}` },
        () => {
          invalidateApiCache();
          loadAllKPIData();
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'invoices', filter: `business_id=eq.${businessId}` },
        () => {
          invalidateApiCache();
          loadAllKPIData();
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessData?.business?.id, loadAllKPIData, refetch]);

  const { setStatusBarStyle } = useStatusBar();
  const debouncedNavigate = useDebounceNavigation(500);
  const pathname = usePathname();
  // Set status bar to dark for white header
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // Prevent back navigation from dashboard (user should not go back to signup/login)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true; // Return true to prevent default back behavior
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const { __getGlobalCache } = require('@/hooks/useBusinessData');
      const cache = __getGlobalCache();
      const now = Date.now();
      const CACHE_DURATION = 30000;
      
      if (!cache.data || (now - cache.timestamp) > CACHE_DURATION) {
        refetch();
        loadAllKPIData();
      }

      refreshPermissions();
    }, [refetch, refreshPermissions, loadAllKPIData])
  );

  // Load leave requests
  const loadLeaveRequests = useCallback(async () => {
    try {
      if (isStaff && staffId) {
        const res = await getLeaveRequests({ staffId });
        if (res.success) setMyLeaveRequests(res.leaveRequests || []);
      }
      if (isOwner) {
        const res = await getLeaveRequests({ status: 'pending' });
        if (res.success) setPendingLeaveRequests(res.leaveRequests || []);
        const allRes = await getLeaveRequests();
        if (allRes.success) setAllLeaveRequests(allRes.leaveRequests || []);
      }
    } catch {}
  }, [isStaff, isOwner, staffId]);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  // Realtime subscription for leave requests: refresh list and on new pending leave show popup + notification (owner only)
  useEffect(() => {
    const businessId = businessData?.business?.id;
    if (!businessId) return;

    const channel = supabase
      .channel(`leave-requests-${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests', filter: `business_id=eq.${businessId}` },
        (payload) => {
          loadLeaveRequests();
          if (isOwner && payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            const staffName = (payload.new as any).staff_name || 'A staff member';
            const msg = `${staffName} has applied for leave. Open Leave Log from the menu to review.`;
            Alert.alert('New leave request', msg, [
              { text: 'Later' },
              { text: 'View Leave Log', onPress: () => debouncedNavigate('/leave-log') },
            ]);
            createInAppNotification({
              businessId,
              recipientId: 'owner',
              recipientType: 'owner',
              title: 'New leave request',
              message: msg,
              type: 'info',
              category: 'leave',
              priority: 'high',
            }).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessData?.business?.id, loadLeaveRequests, isOwner]);

  const handleSubmitLeave = async () => {
    if (!staffId || !leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      Alert.alert('Incomplete', 'Please fill in all fields — start date, end date, and reason.');
      return;
    }
    if (new Date(leaveEndDate) < new Date(leaveStartDate)) {
      Alert.alert('Invalid Dates', 'End date cannot be before start date.');
      return;
    }
    setLeaveSubmitting(true);
    const res = await createLeaveRequest({
      staffId,
      staffName: staffName || 'Staff',
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason.trim(),
    });
    setLeaveSubmitting(false);
    if (res.success) {
      Alert.alert('Leave Applied', 'Your leave request has been submitted to the business owner for approval.');
      setShowLeaveModal(false);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      loadLeaveRequests();
    } else {
      Alert.alert('Error', res.error || 'Failed to submit leave request.');
    }
  };

  const handleReviewLeave = async (status: 'approved' | 'rejected') => {
    if (!reviewingLeave) return;
    setReviewSubmitting(true);
    const res = await updateLeaveRequest(reviewingLeave.id, {
      status,
      reviewerNote: reviewNote.trim() || undefined,
    });
    setReviewSubmitting(false);
    if (res.success) {
      Alert.alert(
        status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
        `The leave request from ${reviewingLeave.staff_name} has been ${status}.`
      );
      setShowLeaveReviewModal(false);
      setReviewingLeave(null);
      setReviewNote('');
      loadLeaveRequests();
    } else {
      Alert.alert('Error', res.error || 'Failed to update leave request.');
    }
  };

  const handleWithdrawLeave = async (leaveId: string) => {
    Alert.alert('Withdraw Leave', 'Are you sure you want to withdraw this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive', onPress: async () => {
          const res = await withdrawLeaveRequest(leaveId);
          if (res.success) {
            Alert.alert('Withdrawn', 'Your leave request has been withdrawn.');
            loadLeaveRequests();
          } else {
            Alert.alert('Error', res.error || 'Failed to withdraw leave request.');
          }
        },
      },
    ]);
  };

  const isStaffOnLeave = useCallback(() => {
    if (!isStaff) return false;
    const today = new Date().toISOString().split('T')[0];
    return myLeaveRequests.some(lr =>
      lr.status === 'approved' && lr.start_date <= today && lr.end_date >= today
    );
  }, [isStaff, myLeaveRequests]);

  const requireOnline = useCallback((action: () => void) => {
    if (isOwner) { action(); return; }
    if (!staffOnline) {
      Alert.alert('Go Online First', 'You must be online to perform this action. Please check in first.');
      return;
    }
    action();
  }, [isOwner, staffOnline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    Promise.all([
      refetch(),
      refreshPermissions(),
      loadAllKPIData(),
      loadLeaveRequests(),
    ]).catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch, refreshPermissions, loadAllKPIData, loadLeaveRequests]);

  // Staff attendance: load active session on mount/focus
  useEffect(() => {
    if (!isStaff || !staffId) return;
    let cancelled = false;
    (async () => {
      const result = await getActiveStaffSession(staffId);
      if (cancelled) return;
      if (result.success && result.session) {
        setStaffOnline(true);
        setActiveSessionId(result.session.id);
        setCheckInTime(result.session.check_in);
        if (staffLocationId) {
          const coords = await getStaffAssignedCoordinates(staffLocationId);
          if (coords) {
            targetCoordsRef.current = coords;
            setActiveSession(staffId, result.session.id);
            const config = await getStaffAttendanceConfig(staffId);
            if (config.attendanceMode === 'geofence') {
              startBackgroundLocationMonitoring(staffId, result.session.id, coords.lat, coords.lng, config.geofenceRadius);
            }
          }
        }
      } else {
        setStaffOnline(false);
        setActiveSessionId(null);
        setCheckInTime(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isStaff, staffId, staffLocationId]);

  // Elapsed time counter
  useEffect(() => {
    if (staffOnline && checkInTime) {
      const update = () => {
        const diff = Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000);
        setElapsedSeconds(diff > 0 ? diff : 0);
      };
      update();
      elapsedTimerRef.current = setInterval(update, 1000);
    } else {
      setElapsedSeconds(0);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
    return () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current); };
  }, [staffOnline, checkInTime]);

  // Load staff geofence radius (owner-configured) for Go Online check
  useEffect(() => {
    if (!isStaff || !staffId) return;
    getStaffAttendanceConfig(staffId).then((config) => {
      setStaffGeofenceRadius(config.geofenceRadius);
    }).catch(() => {});
  }, [isStaff, staffId]);

  // Periodically update staff distance from assigned location
  useEffect(() => {
    if (!isStaff || !staffLocationId) return;
    let cancelled = false;
    const checkDistance = async () => {
      try {
        const coords = await getStaffAssignedCoordinates(staffLocationId);
        if (!coords || cancelled) return;
        targetCoordsRef.current = coords;
        const pos = await getCurrentPosition();
        if (!pos || cancelled) return;
        setStaffDistance(Math.round(calculateDistance(pos.lat, pos.lng, coords.lat, coords.lng)));
      } catch {}
    };
    checkDistance();
    const interval = setInterval(checkDistance, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isStaff, staffLocationId]);

  const formatElapsed = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGoOnline = async () => {
    if (!staffId || !staffBusinessId) {
      Alert.alert(
        'Cannot go online',
        'Your staff account could not be found. Please ensure you are logged in with the phone number registered by your manager, or contact your manager.'
      );
      return;
    }
    setStaffToggleLoading(true);

    try {
      // Ask for location permission first — required before staff can go online
      const perms = await requestLocationPermissions();
      if (!perms.foreground) {
        Alert.alert(
          'Location required',
          'Location access is required to go online. Please allow location permission so we can verify you are at your work location, then try again.'
        );
        setStaffToggleLoading(false);
        return;
      }

      let pos = await getCurrentPosition();
      if (!pos && Platform.OS === 'web') {
        Alert.alert(
          'Location required',
          'Please allow location access in your browser (site settings or the lock/address bar icon) and refresh. You must be within range of your work location to go online.'
        );
        setStaffToggleLoading(false);
        return;
      }
      if (!pos) {
        Alert.alert(
          'Location required',
          'Could not get your location. Please ensure location is enabled in device settings and allow this app to use it, then try again.'
        );
        setStaffToggleLoading(false);
        return;
      }

      const coords = targetCoordsRef.current || (staffLocationId ? await getStaffAssignedCoordinates(staffLocationId) : null);
      if (!coords) {
        Alert.alert(
          'No Location Assigned',
          'You must be assigned to a work location with coordinates. Please contact your manager to assign you to a branch or location.'
        );
        setStaffToggleLoading(false);
        return;
      }
      targetCoordsRef.current = coords;

      const config = await getStaffAttendanceConfig(staffId);
      const radiusMeters = config.geofenceRadius;
      const dist = calculateDistance(pos.lat, pos.lng, coords.lat, coords.lng);
      setStaffDistance(Math.round(dist));

      if (!isWithinGeofence(pos.lat, pos.lng, coords.lat, coords.lng, radiusMeters)) {
        Alert.alert(
          'Too Far Away',
          `You are ${Math.round(dist)}m from your work location. You must be within ${radiusMeters}m to go online.`
        );
        setStaffToggleLoading(false);
        return;
      }

      // Web: no selfie. Mobile (PWA or native): selfie required; if device has no camera, allow without selfie.
      const isWeb = Platform.OS === 'web';
      let selfieUrl: string | undefined;
      if (!isWeb) {
        try {
          const ImagePicker = await import('expo-image-picker');
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.6,
            cameraType: ImagePicker.CameraType.front,
          });
          if (result.canceled) {
            setStaffToggleLoading(false);
            return;
          }
          const asset = result.assets?.[0];
          if (asset?.uri) {
            const filename = `${staffId}_${Date.now()}.jpg`;
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('staff-selfies')
              .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

            if (!uploadError && uploadData?.path) {
              const { data: urlData } = supabase.storage.from('staff-selfies').getPublicUrl(uploadData.path);
              selfieUrl = urlData?.publicUrl;
            }
          }
        } catch (camErr: any) {
          const msg = (camErr?.message || String(camErr)).toLowerCase();
          const noCamera = msg.includes('camera') && (msg.includes('unavailable') || msg.includes('not found') || msg.includes('no camera') || msg.includes('not available'));
          if (noCamera) {
            // Hardware has no camera or camera unavailable — allow go online without selfie
            selfieUrl = undefined;
          } else {
            Alert.alert('Selfie required', 'Please take a selfie to go online.');
            setStaffToggleLoading(false);
            return;
          }
        }
      }

      const sessionResult = await createStaffSession({
        staffId,
        businessId: staffBusinessId,
        selfieUrl,
        latitude: pos.lat,
        longitude: pos.lng,
      });

      if (sessionResult.success && sessionResult.session) {
        setStaffOnline(true);
        setActiveSessionId(sessionResult.session.id);
        setCheckInTime(sessionResult.session.check_in);

        if (perms.background) {
          const attendanceConfig = await getStaffAttendanceConfig(staffId);
          if (attendanceConfig.attendanceMode === 'geofence') {
            startBackgroundLocationMonitoring(staffId, sessionResult.session.id, coords.lat, coords.lng, attendanceConfig.geofenceRadius);
          }
        }
      } else {
        Alert.alert('Error', sessionResult.error || 'Failed to check in.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setStaffToggleLoading(false);
    }
  };

  const handleGoOffline = async () => {
    if (!staffId || !activeSessionId) return;
    setStaffToggleLoading(true);

    try {
      const pos = await getCurrentPosition();
      await endStaffSession({
        sessionId: activeSessionId,
        staffId,
        reason: 'manual',
        latitude: pos?.lat,
        longitude: pos?.lng,
      });

      await stopBackgroundLocationMonitoring();
      setStaffOnline(false);
      setActiveSessionId(null);
      setCheckInTime(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to check out.');
    } finally {
      setStaffToggleLoading(false);
    }
  };

  // Load notifications with realtime subscription
  useEffect(() => {
    if (!businessData?.business?.id) return;
    const businessId = staffBusinessId || businessData.business.id;
    const recipientFilter = isStaff && staffId
      ? { recipientId: staffId, recipientType: 'staff' as const }
      : {};

    const fetchNotifs = () =>
      getInAppNotifications({ businessId, ...recipientFilter, limit: 20 }).then(r => {
        if (r.success && r.notifications) {
          const filtered = r.notifications.filter((n: any) => n.type !== 'chat_message');
          setNotifications(filtered);
        }
      });

    fetchNotifs();

    const channel = supabase.channel('dashboard-notifs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        fetchNotifs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessData?.business?.id, isStaff, staffId, staffBusinessId]);

  // Staff login attempt overlay - filter from notifications, verify staff still needs login
  useEffect(() => {
    if (!isOwner || !businessData?.business?.id) return;

    const candidateAlerts = notifications.filter(
      (n: any) =>
        n.category === 'staff_login_attempt' &&
        (n.status === 'unread' || !n.is_read) &&
        !dismissedAlertIdsRef.current.has(n.id)
    );

    if (candidateAlerts.length === 0) {
      setStaffLoginAlerts([]);
      staffOverlayAnim.setValue(-200);
      return;
    }

    const staffIds = candidateAlerts
      .map((n: any) => n.related_entity_id)
      .filter(Boolean);

    if (staffIds.length === 0) {
      setStaffLoginAlerts(candidateAlerts);
      RNAnimated.spring(staffOverlayAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
      return;
    }

    (async () => {
      try {
        const { data: rows } = await supabase
          .from('staff')
          .select('id, verification_code')
          .in('id', staffIds);

        const alreadyVerifiedIds = new Set(
          (rows || []).filter((r: any) => r.verification_code === null).map((r: any) => r.id)
        );

        candidateAlerts.forEach((a: any) => {
          if (alreadyVerifiedIds.has(a.related_entity_id)) {
            dismissedAlertIdsRef.current.add(a.id);
            markNotificationRead(a.id).catch(() => {});
          }
        });

        const validAlerts = candidateAlerts.filter(
          (a: any) => !alreadyVerifiedIds.has(a.related_entity_id)
        );

        setStaffLoginAlerts(validAlerts);
        if (validAlerts.length > 0) {
          RNAnimated.spring(staffOverlayAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
        } else {
          staffOverlayAnim.setValue(-200);
        }
      } catch {
        setStaffLoginAlerts(candidateAlerts);
        RNAnimated.spring(staffOverlayAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
      }
    })();
  }, [notifications, isOwner, businessData?.business?.id]);

  // Poll staff table to auto-dismiss overlay when verification_code is cleared
  useEffect(() => {
    if (staffLoginAlerts.length === 0) return;

    const staffIds = staffLoginAlerts
      .map((n: any) => n.related_entity_id)
      .filter(Boolean);
    if (staffIds.length === 0) return;

    let cancelled = false;

    const pollStaffCodes = async () => {
      try {
        const { data: rows } = await supabase
          .from('staff')
          .select('id, name, verification_code')
          .in('id', staffIds);

        if (cancelled || !rows) return;

        const verifiedIds = rows
          .filter((r: any) => r.verification_code === null)
          .map((r: any) => r.id);

        if (verifiedIds.length > 0) {
          const alertsToDismiss = staffLoginAlerts.filter(
            (a: any) => verifiedIds.includes(a.related_entity_id)
          );

          alertsToDismiss.forEach((a: any) => {
            dismissedAlertIdsRef.current.add(a.id);
            markNotificationRead(a.id).catch(() => {});
          });

          setStaffLoginAlerts(prev =>
            prev.filter(a => !verifiedIds.includes(a.related_entity_id))
          );
        }
      } catch {}
    };

    pollStaffCodes();
    const interval = setInterval(pollStaffCodes, 5000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [staffLoginAlerts.length]);

  const dismissStaffAlert = async (alert: any) => {
    dismissedAlertIdsRef.current.add(alert.id);
    setStaffLoginAlerts(prev => prev.filter(a => a.id !== alert.id));
    try { await markNotificationRead(alert.id); } catch {}
  };

  // Load online staff with realtime updates
  useEffect(() => {
    if (!hasPermission('staff_management')) return;
    const loadOnline = () => {
      invalidateApiCache('staff');
      getStaffList().then(r => {
        if (r.success && r.staff) {
          setOnlineStaff(r.staff.filter((s: any) => s.is_online === true && !s.is_deleted));
        }
      });
    };
    loadOnline();

    const businessId = staffBusinessId || businessData?.business?.id;
    if (!businessId) return;

    const channel = supabase.channel('staff-online-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'staff',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        loadOnline();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessData?.business?.id, staffBusinessId]);

  // Check for incomplete staff profiles after signup
  useEffect(() => {
    if (!isOwner || incompleteStaffDismissedRef.current) return;
    const checkIncomplete = async () => {
      try {
        const result = await getStaffList();
        if (!result.success || !result.staff) return;
        const userPhone = businessData?.user?.phone || '';
        const ownerPhoneLast10 = userPhone.replace(/\D/g, '').slice(-10);
        const staffOnly = result.staff.filter((s: any) => {
          if (s.is_deleted) return false;
          const sRole = (s.role || '').toLowerCase();
          if (sRole.includes('owner')) return false;
          const sMobile = (s.mobile || '').replace(/\D/g, '').slice(-10);
          if (ownerPhoneLast10 && sMobile === ownerPhoneLast10) return false;
          return true;
        });
        const incomplete = staffOnly.filter((s: any) => {
          const missingAddress = !s.address;
          const missingSalary = !s.basic_salary && s.basic_salary !== 0;
          return missingAddress || missingSalary;
        });
        setIncompleteStaffList(incomplete);
        setShowIncompleteStaffBanner(incomplete.length > 0);
      } catch {}
    };
    checkIncomplete();
  }, [isOwner, businessData?.user?.phone]);

  useEffect(() => {
    if (!isOwner || noCodeDismissedRef.current) return;
    const checkNoCode = async () => {
      try {
        const result = await getStaffList();
        if (!result.success || !result.staff) return;
        const userPhone = businessData?.user?.phone || '';
        const ownerPhoneLast10 = userPhone.replace(/\D/g, '').slice(-10);
        const staffOnly = result.staff.filter((s: any) => {
          if (s.is_deleted) return false;
          const sRole = (s.role || '').toLowerCase();
          if (sRole.includes('owner')) return false;
          const sMobile = (s.mobile || '').replace(/\D/g, '').slice(-10);
          if (ownerPhoneLast10 && sMobile === ownerPhoneLast10) return false;
          return true;
        });
        const noCode = staffOnly.filter((s: any) => !s.user_id && !s.verification_code);
        setNoCodeStaffList(noCode);
        setShowNoCodeBanner(noCode.length > 0);
      } catch {}
    };
    checkNoCode();
  }, [isOwner, businessData?.user?.phone]);

  const handleGenerateCodeForStaff = useCallback(async (staff: any) => {
    setGeneratingCodeFor(staff.id);
    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { error } = await supabase
        .from('staff')
        .update({ verification_code: newCode })
        .eq('id', staff.id);
      if (error) {
        Alert.alert('Error', 'Failed to generate code. Please try again.');
        setGeneratingCodeFor(null);
        return;
      }
      Alert.alert(
        'Code Generated',
        `Login code for ${staff.name}: ${newCode}\n\nShare this code with them so they can log in.`,
        [
          { text: 'Copy Code', onPress: async () => {
            try { await Clipboard.setStringAsync(newCode); } catch {}
          }},
          { text: 'Share', onPress: async () => {
            try { await Share.share({ message: `Hi ${staff.name}, your Manager ERP first-login code is: ${newCode}` }); } catch {}
          }},
          { text: 'OK' },
        ]
      );
      setNoCodeStaffList(prev => prev.filter(s => s.id !== staff.id));
      if (noCodeStaffList.length <= 1) {
        setShowNoCodeBanner(false);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setGeneratingCodeFor(null);
    }
  }, [noCodeStaffList.length]);

  const loadUnreadChats = useCallback(() => {
    const bid = staffBusinessId || businessData?.business?.id;
    if (!bid) return;
    getTotalUnreadChatCount(bid, !!isStaff).then(setUnreadChatCount);
  }, [staffBusinessId, businessData?.business?.id, isStaff]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadChats();
    }, [loadUnreadChats])
  );

  useEffect(() => {
    const businessId = staffBusinessId || businessData?.business?.id;
    if (!businessId) return;

    const channel = supabase.channel('dashboard-chat-unread')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        loadUnreadChats();
      })
      .subscribe();

    // Cross-business subscription for conversations where user is the other participant
    let crossChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user?.id) return;
      crossChannel = supabase.channel('dashboard-chat-cross')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `participant_other_user_id=eq.${session.user.id}`,
        }, () => {
          loadUnreadChats();
        })
        .subscribe();
    })();

    // Polling fallback to catch any missed realtime events
    const pollInterval = setInterval(loadUnreadChats, 30000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (crossChannel) supabase.removeChannel(crossChannel);
      clearInterval(pollInterval);
    };
  }, [businessData?.business?.id, staffBusinessId, loadUnreadChats]);

  // ✅ Save device snapshot in background (non-blocking, only once per session)
  const deviceSnapshotSavedRef = React.useRef(false);
  useEffect(() => {
    if (deviceSnapshotSavedRef.current) return; // Only save once per session
    
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        deviceSnapshotSavedRef.current = true; // Mark as saved
        
        const { collectDeviceSnapshot } = await import('@/utils/deviceInfo');
        const { saveDeviceSnapshot } = await import('@/services/backendApi');
        const ds = await collectDeviceSnapshot();
        if (ds.deviceId) {
          saveDeviceSnapshot({
            deviceId: ds.deviceId,
            deviceName: ds.deviceName,
            deviceBrand: ds.deviceBrand,
            deviceModel: ds.deviceModel,
            deviceType: ds.deviceType,
            deviceYearClass: ds.deviceYearClass,
            osName: ds.osName,
            osVersion: ds.osVersion,
            platformApiLevel: ds.platformApiLevel,
            networkServiceProvider: ds.networkServiceProvider,
            internetServiceProvider: ds.internetServiceProvider,
            networkType: ds.networkType,
            wifiName: ds.wifiName,
            bluetoothName: ds.bluetoothName,
            ipAddress: ds.ipAddress,
            manufacturer: ds.manufacturer,
            totalMemory: ds.totalMemory,
            isDevice: ds.isDevice,
            isEmulator: ds.isEmulator,
            isTablet: ds.isTablet,
            screenWidth: ds.screenWidth,
            screenHeight: ds.screenHeight,
            screenScale: ds.screenScale,
            pixelDensity: ds.pixelDensity,
            totalStorage: ds.totalStorage,
            freeStorage: ds.freeStorage,
            batteryLevel: ds.batteryLevel,
            batteryState: ds.batteryState,
            carrierName: ds.carrierName,
            mobileCountryCode: ds.mobileCountryCode,
            mobileNetworkCode: ds.mobileNetworkCode,
            appVersion: ds.appVersion,
            appBuildNumber: ds.appBuildNumber,
            expoSdkVersion: ds.expoSdkVersion,
            locale: ds.locale,
            timezone: ds.timezone,
          }).then((result) => {
            if (result?.success) {
              console.log('✅ Device snapshot saved');
            } else {
              console.warn('⚠️ Device snapshot save failed:', result?.error);
            }
          }).catch((err) => {
            console.warn('⚠️ Device snapshot error:', err);
          });
        }
      } catch (error) {
        console.warn('⚠️ Device snapshot collection error:', error);
      }
    })();
  }, []);

  const handleMenuPress = () => {
    setShowHamburgerMenu(true);
  };

  const handleSalesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/sales');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleReceivablesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/receivables');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handlePayablesPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/payables');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleLowStockPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/inventory/low-stock');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleReturnsPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/returns');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleNotificationsPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/notifications');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleSalesOverviewPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/reports');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleStaffPress = (staffId: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/people/staff');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleStockDiscrepancyPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/inventory/stock-discrepancies');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const toggleLastWeekExpansion = () => {
    setIsLastWeekExpanded(!isLastWeekExpanded);
  };

  const handleMenuNavigation = (route: any) => {
    if (isNavigating) return;

    if (route === '/dashboard') {
      setShowHamburgerMenu(false);
      return;
    }

    setIsNavigating(true);
    debouncedNavigate(route);
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleFABAction = (_action: string) => {};

  const renderGreeting = () => {
    const displayUserName = businessData?.user?.full_name || '';
    const displayBusinessName = businessData?.business?.legal_name || '';
    
    return (
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          {getGreeting()}, <Text style={styles.greetingName}>{displayUserName}</Text>
        </Text>
        <Text style={styles.greetingSubtext}>
          Welcome to <Text style={styles.greetingBusinessName}>{displayBusinessName}</Text>
        </Text>
      </View>
    );
  };

  const renderStaffAttendanceToggle = () => {
    const hasAssignedLocation = !!staffLocationId;
    const withinRange = hasAssignedLocation && staffDistance !== null && staffDistance <= staffGeofenceRadius;
    const allowGoOnline = staffOnline || withinRange;

    return (
      <View style={[styles.section, { borderLeftWidth: 4, borderLeftColor: staffOnline ? '#059669' : '#6B7280' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: staffOnline ? '#059669' : '#DC2626' }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.text }}>
              {staffOnline ? 'You\'re Online' : 'You\'re Offline'}
            </Text>
          </View>
          {staffOnline && (
            <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669', fontVariant: ['tabular-nums'] }}>
                {formatElapsed(elapsedSeconds)}
              </Text>
            </View>
          )}
        </View>

        {!staffOnline && !hasAssignedLocation && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
            <MapPin size={14} color={Colors.textLight} />
            <Text style={{ fontSize: 13, color: Colors.textLight, fontWeight: '500' }}>
              No work location assigned. Contact your manager to be assigned to a branch or location.
            </Text>
          </View>
        )}
        {!staffOnline && hasAssignedLocation && staffDistance !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
            <MapPin size={14} color={withinRange ? '#059669' : '#DC2626'} />
            <Text style={{ fontSize: 13, color: withinRange ? '#059669' : '#DC2626', fontWeight: '500' }}>
              {withinRange ? `Within range (${staffDistance}m)` : `${staffDistance}m away — must be within ${staffGeofenceRadius}m`}
            </Text>
          </View>
        )}

        {staffOnline && checkInTime && (
          <Text style={{ fontSize: 13, color: Colors.textLight, marginBottom: 12, paddingHorizontal: 4 }}>
            Checked in at {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        <Pressable
          onPress={staffOnline ? handleGoOffline : handleGoOnline}
          disabled={staffToggleLoading || (!staffOnline && !allowGoOnline)}
          style={({ pressed }) => [
            {
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 14, borderRadius: 12,
              backgroundColor: staffToggleLoading
                ? '#9CA3AF'
                : staffOnline
                  ? '#DC2626'
                  : allowGoOnline
                    ? '#059669'
                    : '#D1D5DB',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {staffToggleLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              {staffOnline ? <Power size={18} color="#fff" /> : <Camera size={18} color="#fff" />}
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                {staffOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  const fmtCurrency = (val: number) => formatCurrencyINR(val, 2, 0);

  const renderKPICards = () => (
    <View style={styles.kpiContainer}>
      {hasPermission('sales') && (
        <Pressable onPress={isNavigating ? undefined : handleSalesPress} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Total Sales</Text>
              <ShoppingCart size={20} color={Colors.success} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.success }]}>{fmtCurrency(totalSales)}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiPeriod}>View all sales</Text>
            </View>
          </View>
        </Pressable>
      )}

      {hasPermission('inventory') && (
        <Pressable onPress={isNavigating ? undefined : handleReturnsPress} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Returns</Text>
              <RotateCcw size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.error }]}>{fmtCurrency(totalReturns)}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiPeriod}>View all returns</Text>
            </View>
          </View>
        </Pressable>
      )}

      {hasPermission('inventory') && (
        <Pressable onPress={isNavigating ? undefined : handleLowStockPress} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Low Stock Items</Text>
              <AlertTriangle size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.error }]}>{lowStockCount}</Text>
            <View style={styles.kpiFooter}>
              {nearLowStockCount > 0 ? (
                <Text style={styles.kpiPeriod}>
                  <Text style={{ color: Colors.error, fontWeight: '600' }}>{lowStockCount} low</Text>
                  {' · '}
                  <Text style={{ color: '#D97706', fontWeight: '600' }}>{nearLowStockCount} near low</Text>
                </Text>
              ) : (
                <Text style={styles.kpiPeriod}>View low stock</Text>
              )}
            </View>
          </View>
        </Pressable>
      )}

      {hasPermission('payment_processing') && (
        <Pressable onPress={isNavigating ? undefined : handleReceivablesPress} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Receivables</Text>
              <ArrowDownLeft size={20} color={Colors.success} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.success }]}>{fmtCurrency(totalReceivables)}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiPeriod}>View receivables</Text>
            </View>
          </View>
        </Pressable>
      )}

      {hasPermission('payment_processing') && (
        <Pressable onPress={isNavigating ? undefined : handlePayablesPress} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Payables</Text>
              <ArrowUpRight size={20} color={Colors.error} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.error }]}>{fmtCurrency(totalPayables)}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiPeriod}>View payables</Text>
            </View>
          </View>
        </Pressable>
      )}

      {hasPermission('inventory') && (
        <Pressable onPress={isNavigating ? undefined : () => debouncedNavigate('/inventory/stock-out')} disabled={isNavigating}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.orange }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Write-Offs</Text>
              <Trash2 size={20} color={Colors.orange} />
            </View>
            <Text style={[styles.kpiAmount, { color: Colors.orange }]}>
              {writeOffSummary.count > 0 ? fmtCurrency(writeOffSummary.totalValue) : '₹0'}
            </Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiPeriod}>{writeOffSummary.count} this month</Text>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );

  const renderStockDiscrepancies = () => (
    <View style={styles.section}>
      <Pressable onPress={isNavigating ? undefined : handleStockDiscrepancyPress} disabled={isNavigating}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stock Discrepancies</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {stockDiscrepancies.length > 0 && (
              <View style={{ backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{stockDiscrepancies.length}</Text>
              </View>
            )}
            <AlertTriangle size={20} color={Colors.text} />
          </View>
        </View>
      </Pressable>
      <View style={styles.discrepancyList}>
        {stockDiscrepancies.length === 0 ? (
          <Text style={{ color: Colors.textLight, fontSize: 14, textAlign: 'center', padding: 16 }}>
            No stock discrepancies found
          </Text>
        ) : (
          stockDiscrepancies.map((d) => (
            <Pressable key={d.id} onPress={handleStockDiscrepancyPress}>
              <View style={[styles.notificationItem, { borderLeftWidth: 3, borderLeftColor: Colors.error }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }}>{d.poNumber}</Text>
                    <Text style={{ fontSize: 12, color: Colors.textLight }}>{d.supplier}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ fontSize: 13, color: Colors.textLight }}>
                      Ordered: <Text style={{ fontWeight: '600', color: Colors.text }}>{d.ordered}</Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: Colors.textLight }}>
                      Received: <Text style={{ fontWeight: '600', color: d.received < d.ordered ? Colors.error : Colors.success }}>{d.received}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );

  const getRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'alert': case 'urgent': return Colors.error;
      case 'warning': return Colors.warning;
      case 'success': return Colors.success;
      default: return Colors.primary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.error;
      case 'medium': return '#D97706';
      case 'low': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const getNotifStatusBg = (status: string) => {
    switch (status) {
      case 'unread': return '#FEF3F2';
      case 'read': return '#EFF6FF';
      case 'acknowledged': return '#FFFBEB';
      case 'resolved': return '#ECFDF5';
      default: return Colors.grey[50];
    }
  };

  const getNotifStatusBorder = (status: string) => {
    switch (status) {
      case 'unread': return Colors.error;
      case 'read': return '#3B82F6';
      case 'acknowledged': return '#D97706';
      case 'resolved': return Colors.success;
      default: return Colors.grey[200];
    }
  };

  const renderNotifications = () => {
    const unreadCount = notifications.filter(n => n.status === 'unread' || (!n.status && !n.is_read)).length;

    return (
      <View style={styles.section}>
        <Pressable onPress={isNavigating ? undefined : handleNotificationsPress} disabled={isNavigating}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notification Center</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unreadCount}</Text>
                </View>
              )}
              <Bell size={20} color={Colors.text} />
            </View>
          </View>
        </Pressable>
        <View style={styles.notificationList}>
          {notifications.length === 0 ? (
            <Text style={{ color: Colors.textLight, fontSize: 14, textAlign: 'center', padding: 16 }}>
              No new notifications
            </Text>
          ) : (
            <>
              {notifications.slice(0, 3).map((notif) => {
                const priority = notif.priority || 'medium';
                const status = notif.status || (notif.is_read ? 'read' : 'unread');
                const pColor = getPriorityColor(priority);
                const bgColor = getNotifStatusBg(status);
                const borderColor = getNotifStatusBorder(status);

                return (
                  <Pressable
                    key={notif.id}
                    onPress={handleNotificationsPress}
                  >
                    <View style={[
                      styles.notificationItem,
                      { backgroundColor: bgColor, borderLeftWidth: 3, borderLeftColor: borderColor },
                    ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pColor, marginTop: 6 }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1 }} numberOfLines={1}>
                              {notif.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ backgroundColor: pColor + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: pColor }}>
                                  {priority.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text style={{ fontSize: 13, color: Colors.textLight, lineHeight: 18 }} numberOfLines={2}>
                            {notif.message}
                          </Text>
                          <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 4 }}>
                            {getRelativeTime(notif.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
              {notifications.length > 3 && (
                <Pressable onPress={handleNotificationsPress}>
                  <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 10 }}>
                    View all {notifications.length} notifications →
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Render staff performance section
  const renderStaffPerformance = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff Performance</Text>
        <Users size={20} color={Colors.text} />
      </View>
      <View style={styles.staffList}>
        {onlineStaff.length === 0 ? (
          <Text style={{ color: Colors.textLight, fontSize: 14, textAlign: 'center', padding: 16 }}>
            No staff currently online
          </Text>
        ) : (
          onlineStaff.map((staff) => (
            <Pressable key={staff.id} onPress={() => handleStaffPress(staff.id)}>
              <View style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary }}>
                      {(staff.full_name || staff.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffNameText}>{staff.full_name || staff.name || 'Staff'}</Text>
                    <Text style={styles.staffAttendance}>{staff.role || 'Staff'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
                    <Text style={{ fontSize: 12, color: Colors.success, fontWeight: '600' }}>Online</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
        <Pressable
          onPress={() => debouncedNavigate('/people/staff')}
          style={{ marginTop: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>View All Staff</Text>
        </Pressable>
      </View>
    </View>
  );

  // Render business overview section
  const fmtCompact = (val: number) => {
    if (val >= 10000000) return '₹' + formatIndianNumber(val / 10000000, 1) + ' Cr';
    if (val >= 100000) return '₹' + formatIndianNumber(val / 100000, 1) + ' L';
    return formatCurrencyINR(val, 2, 0);
  };

  const cashBalance = businessData?.business?.current_cash_balance ?? 0;
  const bankBalance = businessData?.business?.current_primary_bank_balance ?? 0;
  const totalFunds = businessData?.business?.current_total_funds ?? (cashBalance + bankBalance);

  const renderBusinessOverview = () => (
    <View style={[styles.section, styles.lastSection]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Business Overview</Text>
        <Clock size={20} color={Colors.text} />
      </View>

      <Pressable onPress={isNavigating ? undefined : handleSalesOverviewPress} disabled={isNavigating}>
        <View style={styles.salesOverview}>
          <View style={styles.periodSection}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>Today</Text>
              <View style={styles.periodStats}>
                <Text style={styles.periodAmount}>{fmtCurrency(todaySales)}</Text>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderCount}>{todayOrders} {todayOrders === 1 ? 'order' : 'orders'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentMethods}>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentAmount}>{fmtCompact(cashBalance)}</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>Bank</Text>
              <Text style={styles.paymentAmount}>{fmtCompact(bankBalance)}</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentTitle}>Total</Text>
              <Text style={[styles.paymentAmount, { fontWeight: '700' }]}>{fmtCompact(totalFunds)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable onPress={toggleLastWeekExpansion}>
            <View style={styles.periodSection}>
              <View style={styles.expandableHeader}>
                <View style={styles.periodHeader}>
                  <Text style={styles.periodTitle}>Last Week</Text>
                  <View style={styles.periodStats}>
                    <Text style={styles.periodAmount}>{fmtCurrency(weekSales)}</Text>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderCount}>{weekOrders} {weekOrders === 1 ? 'order' : 'orders'}</Text>
                    </View>
                  </View>
                </View>
                {isLastWeekExpanded ? (
                  <ChevronUp size={20} color={Colors.text} />
                ) : (
                  <ChevronDown size={20} color={Colors.text} />
                )}
              </View>
            </View>
          </Pressable>

          {isLastWeekExpanded && (
            <>
              <View style={styles.divider} />
              <View style={styles.paymentMethods}>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentTitle}>Cash</Text>
                  <Text style={styles.paymentAmount}>{fmtCompact(cashBalance)}</Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentTitle}>Bank</Text>
                  <Text style={styles.paymentAmount}>{fmtCompact(bankBalance)}</Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentTitle}>Total</Text>
                  <Text style={[styles.paymentAmount, { fontWeight: '700' }]}>{fmtCompact(totalFunds)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );

  const formatLeaveDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getLeaveStatusColor = (status: string) => {
    if (status === 'approved') return Colors.success;
    if (status === 'rejected') return Colors.error;
    return Colors.warning;
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const renderApplyForLeave = () => {
    const onLeave = isStaffOnLeave();
    const hasPendingLeave = myLeaveRequests.some(lr => lr.status === 'pending');

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leave Management</Text>
          <CalendarDays size={20} color={Colors.text} />
        </View>

        <Pressable
          onPress={() => {
            setLeaveStartDate(getTodayStr());
            setLeaveEndDate(getTodayStr());
            setShowLeaveModal(true);
          }}
          disabled={onLeave || hasPendingLeave}
          style={({ pressed }) => [
            {
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 14, borderRadius: 12,
              backgroundColor: (onLeave || hasPendingLeave) ? Colors.grey[300] : pressed ? '#4338CA' : Colors.primary,
            },
          ]}
        >
          <CalendarDays size={18} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
            {onLeave ? 'Currently On Leave' : hasPendingLeave ? 'Leave Request Pending' : 'Apply for Leave'}
          </Text>
        </Pressable>

        {myLeaveRequests.length > 0 && (
          <View style={{ marginTop: 16, gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 }}>My Leave Requests</Text>
            {myLeaveRequests.map((lr) => (
              <View key={lr.id} style={{
                backgroundColor: Colors.grey[50], borderRadius: 10, padding: 12,
                borderLeftWidth: 3, borderLeftColor: getLeaveStatusColor(lr.status),
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text }}>
                    {formatLeaveDate(lr.start_date)} — {formatLeaveDate(lr.end_date)}
                  </Text>
                  <View style={{
                    backgroundColor: getLeaveStatusColor(lr.status) + '20',
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: getLeaveStatusColor(lr.status), textTransform: 'capitalize' }}>
                      {lr.status}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: Colors.textLight }}>{lr.reason}</Text>
                {lr.reviewer_note && (
                  <Text style={{ fontSize: 12, color: Colors.primary, marginTop: 4, fontStyle: 'italic' }}>
                    Owner: {lr.reviewer_note}
                  </Text>
                )}
                {lr.reviewed_at && (
                  <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 2 }}>
                    Reviewed: {new Date(lr.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                )}
                {lr.status === 'pending' && (
                  <Pressable
                    onPress={() => handleWithdrawLeave(lr.id)}
                    style={({ pressed }) => [{
                      marginTop: 8, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                      backgroundColor: pressed ? '#B91C1C' : Colors.error,
                    }]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Withdraw Request</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const dashboardSections = [
    { id: 'greeting', render: renderGreeting },
    ...(isStaff ? [{ id: 'attendance-toggle', render: renderStaffAttendanceToggle }] : []),
    ...(isStaff ? [{ id: 'apply-leave', render: renderApplyForLeave }] : []),
    { id: 'kpi', render: renderKPICards },
    ...(hasPermission('inventory') ? [{ id: 'discrepancies', render: renderStockDiscrepancies }] : []),
    { id: 'notifications', render: renderNotifications },
    ...(hasPermission('staff_management') ? [{ id: 'staff', render: renderStaffPerformance }] : []),
    ...(hasPermission('reports') ? [{ id: 'overview', render: renderBusinessOverview }] : []),
  ];

  const renderSection = ({ item }: { item: { id: string; render: () => React.ReactElement } }) => {
    return item.render();
  };

  const webContainerStyles = getWebContainerStyles();

  return (
          <ResponsiveContainer>
            <SafeAreaView style={styles.safeArea}>
              {/* Header */}
              <View style={styles.header}>
                {/* Hamburger Menu - Only on mobile */}
                {Platform.OS !== 'web' && (
                  <Pressable onPress={handleMenuPress}>
                    <View style={styles.menuButton}>
                      <Menu size={24} color={Colors.text} />
                    </View>
                  </Pressable>
                )}
                
                <Text style={styles.headerTitle}>Dashboard</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => debouncedNavigate('/notifications')} style={styles.chatIconWrapper}>
                  <Bell size={22} color={Colors.text} />
                  {notifications.filter(n => n.status === 'unread' || (!n.status && !n.is_read)).length > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {(() => {
                          const c = notifications.filter(n => n.status === 'unread' || (!n.status && !n.is_read)).length;
                          return c > 99 ? '99+' : c;
                        })()}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={() => debouncedNavigate('/chat')} style={styles.chatIconWrapper}>
                  <MessageSquare size={22} color={Colors.text} />
                  {unreadChatCount > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {dataLoading ? (
                <DashboardSkeleton />
              ) : (
                <FlatList
                  data={dashboardSections}
                  renderItem={renderSection}
                  keyExtractor={(item) => item.id}
                  style={styles.flatList}
                  contentContainerStyle={[
                    styles.flatListContent,
                    Platform.OS === 'web' ? webContainerStyles.webScrollContent : { paddingHorizontal: 0 }
                  ]}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  bounces={true}
                  alwaysBounceVertical={false}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  removeClippedSubviews={false}
                  initialNumToRender={6}
                  maxToRenderPerBatch={6}
                  windowSize={10}
                  scrollIndicatorInsets={{ right: -1000, bottom: -1000 }}
                  persistentScrollbar={false}
                  indicatorStyle="white"
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
              )}

              {/* Hamburger Menu - Only on mobile */}
              {Platform.OS !== 'web' && (
                <HamburgerMenu
                  visible={showHamburgerMenu}
                  onClose={() => setShowHamburgerMenu(false)}
                  onNavigate={handleMenuNavigation}
                />
              )}

              <FAB
                onAction={handleFABAction}
                onBeforeAction={(actionId) => {
                  if (isStaff && !staffOnline && actionId !== 'notify-owner') {
                    Alert.alert('Go Online First', 'You must be online to perform this action. Please check in first.');
                    return false;
                  }
                  return true;
                }}
                hiddenActions={[
                  ...(!hasPermission('sales') ? ['new-sale'] : []),
                  ...(!hasPermission('inventory') ? ['return', 'stock'] : []),
                  ...(!hasPermission('payment_processing') ? ['payments', 'expense'] : []),
                  ...(!hasPermission('staff_management') ? ['notify-staff'] : []),
                ]}
              />

              {/* Staff Without Login Codes Banner */}
              {showNoCodeBanner && noCodeStaffList.length > 0 && staffLoginAlerts.length === 0 && (
                <View style={{
                  position: 'absolute' as const, top: Platform.OS === 'ios' ? 50 : 10,
                  left: 12, right: 12, zIndex: 9997,
                }}>
                  <View style={{
                    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16,
                    borderWidth: 1.5, borderColor: '#FCA5A5',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
                  }}>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 10, backgroundColor: '#DC2626',
                        alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 10,
                      }}>
                        <KeyRound size={18} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700' as const, color: '#1F2937' }}>
                          {noCodeStaffList.length === 1
                            ? `${noCodeStaffList[0].name} has no login code`
                            : `${noCodeStaffList.length} staff members need login codes`}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 1 }}>
                          They cannot log in without a code
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          noCodeDismissedRef.current = true;
                          setShowNoCodeBanner(false);
                        }}
                        hitSlop={12}
                        style={{ padding: 4 }}
                      >
                        <X size={18} color="#9CA3AF" />
                      </Pressable>
                    </View>

                    {noCodeStaffList.map((staff) => (
                      <View key={staff.id} style={{
                        flexDirection: 'row' as const, alignItems: 'center' as const,
                        backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 6,
                        borderWidth: 1, borderColor: '#FECACA',
                      }}>
                        <View style={{
                          width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2',
                          alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 10,
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#DC2626' }}>
                            {(staff.name || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600' as const, color: '#1F2937' }}>
                            {staff.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{staff.mobile}</Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row' as const, alignItems: 'center' as const,
                            backgroundColor: '#3F66AC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                          }}
                          activeOpacity={0.7}
                          disabled={generatingCodeFor === staff.id}
                          onPress={() => handleGenerateCodeForStaff(staff)}
                        >
                          {generatingCodeFor === staff.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <KeyRound size={14} color="#fff" />
                              <Text style={{ fontSize: 12, fontWeight: '700' as const, color: '#fff', marginLeft: 4 }}>
                                Generate
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Incomplete Staff Details Banner */}
              {showIncompleteStaffBanner && incompleteStaffList.length > 0 && staffLoginAlerts.length === 0 && !showNoCodeBanner && (
                <View style={{
                  position: 'absolute' as const, top: Platform.OS === 'ios' ? 50 : 10,
                  left: 12, right: 12, zIndex: 9998,
                }}>
                  <View style={{
                    backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16,
                    borderWidth: 1.5, borderColor: '#FB923C',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
                  }}>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 10, backgroundColor: '#EA580C',
                        alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 10,
                      }}>
                        <Users size={18} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700' as const, color: '#1F2937' }}>
                          {incompleteStaffList.length === 1
                            ? `${incompleteStaffList[0].name}'s profile is incomplete`
                            : `${incompleteStaffList.length} staff profiles are incomplete`}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#9A3412', marginTop: 2 }}>
                          {incompleteStaffList.length === 1
                            ? 'Complete address and salary'
                            : 'Tap to complete their details'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          incompleteStaffDismissedRef.current = true;
                          setShowIncompleteStaffBanner(false);
                        }}
                        hitSlop={12}
                        style={{ padding: 4 }}
                      >
                        <X size={18} color="#9CA3AF" />
                      </Pressable>
                    </View>
                    <TouchableOpacity
                      style={{
                        marginTop: 12, backgroundColor: '#EA580C', borderRadius: 10,
                        paddingVertical: 10, alignItems: 'center' as const,
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (incompleteStaffList.length === 1) {
                          router.push({ pathname: '/people/add-staff', params: { staffId: incompleteStaffList[0].id } });
                        } else {
                          router.push('/people/staff');
                        }
                        incompleteStaffDismissedRef.current = true;
                        setShowIncompleteStaffBanner(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#fff' }}>
                        {incompleteStaffList.length === 1 ? 'Complete Profile' : 'Go to Staff Section'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Staff Login Attempt Overlay */}
              {staffLoginAlerts.length > 0 && (
                <RNAnimated.View style={{
                  position: 'absolute' as const, top: Platform.OS === 'ios' ? 50 : 10,
                  left: 12, right: 12, zIndex: 9999,
                  transform: [{ translateY: staffOverlayAnim }],
                }}>
                  {staffLoginAlerts.map((alert) => {
                    const code = (alert.message || '').match(/:\s*(\d{6})/)?.[1] || '';
                    const staffName = alert.source_staff_name || alert.title?.replace(' is trying to log in', '') || 'Staff';
                    return (
                      <View key={alert.id} style={{
                        backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16,
                        marginBottom: 8, borderWidth: 1.5, borderColor: '#F59E0B',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
                      }}>
                        <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10 }}>
                          <View style={{
                            width: 36, height: 36, borderRadius: 10, backgroundColor: '#D97706',
                            alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 10,
                          }}>
                            <KeyRound size={18} color="#fff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700' as const, color: '#1F2937' }}>
                              {staffName} is trying to log in
                            </Text>
                            <Text style={{ fontSize: 12, color: '#92400E', marginTop: 1 }}>First-time login verification</Text>
                          </View>
                          <Pressable
                            onPress={() => dismissStaffAlert(alert)}
                            hitSlop={12}
                            style={{ padding: 4 }}
                          >
                            <X size={18} color="#9CA3AF" />
                          </Pressable>
                        </View>

                        {code ? (
                          <>
                            <View style={{ flexDirection: 'row' as const, justifyContent: 'center' as const, marginBottom: 12 }}>
                              {code.split('').map((digit: string, idx: number) => (
                                <View key={idx} style={{
                                  width: 40, height: 48, borderRadius: 10, backgroundColor: '#FEF3C7',
                                  borderWidth: 2, borderColor: '#F59E0B',
                                  alignItems: 'center' as const, justifyContent: 'center' as const, marginHorizontal: 3,
                                }}>
                                  <Text style={{ fontSize: 22, fontWeight: '800' as const, color: '#92400E' }}>{digit}</Text>
                                </View>
                              ))}
                            </View>
                            <View style={{ flexDirection: 'row' as const }}>
                              <TouchableOpacity
                                style={{
                                  flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const,
                                  justifyContent: 'center' as const, backgroundColor: '#3f66ac',
                                  borderRadius: 10, paddingVertical: 11, marginRight: 8,
                                }}
                                activeOpacity={0.7}
                                onPress={async () => {
                                  try { await Clipboard.setStringAsync(code); Alert.alert('Copied', 'Code copied to clipboard'); } catch {}
                                }}
                              >
                                <Copy size={16} color="#fff" />
                                <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#fff', marginLeft: 6 }}>Copy Code</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{
                                  width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff',
                                  borderWidth: 1, borderColor: '#E5E7EB',
                                  alignItems: 'center' as const, justifyContent: 'center' as const,
                                }}
                                activeOpacity={0.7}
                                onPress={async () => {
                                  const msg = `Hi ${staffName}, your Manager ERP first-login code is: ${code}`;
                                  try { await Share.share({ message: msg }); } catch {}
                                }}
                              >
                                <Share2 size={16} color="#3f66ac" />
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <View>
                            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' as const, marginBottom: 10 }}>
                              No verification code found for this staff member.
                            </Text>
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row' as const, alignItems: 'center' as const,
                                justifyContent: 'center' as const, backgroundColor: '#3f66ac',
                                borderRadius: 10, paddingVertical: 11,
                              }}
                              activeOpacity={0.7}
                              onPress={async () => {
                                try {
                                  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                                  const entityId = alert.related_entity_id;
                                  if (!entityId) {
                                    Alert.alert('Error', 'Cannot identify staff member');
                                    return;
                                  }
                                  const { error } = await supabase
                                    .from('staff')
                                    .update({ verification_code: newCode })
                                    .eq('id', entityId);
                                  if (error) {
                                    Alert.alert('Error', 'Failed to generate code');
                                  } else {
                                    Alert.alert('Code Generated', `Code ${newCode} generated. Share it with ${staffName} to complete login.`);
                                    dismissStaffAlert(alert);
                                  }
                                } catch {
                                  Alert.alert('Error', 'Something went wrong');
                                }
                              }}
                            >
                              <KeyRound size={16} color="#fff" />
                              <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#fff', marginLeft: 6 }}>Generate Login Code</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </RNAnimated.View>
              )}
              {/* Leave Application Modal (Staff) */}
              <Modal visible={showLeaveModal} transparent animationType="fade" onRequestClose={() => setShowLeaveModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>Apply for Leave</Text>
                      <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                        <X size={22} color={Colors.textLight} />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 }}>Start Date *</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, marginBottom: 14 }}
                      value={leaveStartDate}
                      onChangeText={(t) => {
                        const cleaned = t.replace(/[^0-9-]/g, '');
                        if (cleaned.length <= 10) setLeaveStartDate(cleaned);
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="default"
                    />

                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 }}>End Date *</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, marginBottom: 14 }}
                      value={leaveEndDate}
                      onChangeText={(t) => {
                        const cleaned = t.replace(/[^0-9-]/g, '');
                        if (cleaned.length <= 10) setLeaveEndDate(cleaned);
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="default"
                    />

                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 }}>Reason *</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' }}
                      value={leaveReason}
                      onChangeText={setLeaveReason}
                      placeholder="Enter reason for leave"
                      placeholderTextColor={Colors.textLight}
                      multiline
                      numberOfLines={3}
                    />

                    <Pressable
                      onPress={handleSubmitLeave}
                      disabled={leaveSubmitting}
                      style={({ pressed }) => [{
                        backgroundColor: leaveSubmitting ? Colors.grey[300] : pressed ? '#4338CA' : Colors.primary,
                        borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                      }]}
                    >
                      {leaveSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Submit Leave Request</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </Modal>

              {/* Leave Review Modal (Owner) */}
              <Modal visible={showLeaveReviewModal} transparent animationType="fade" onRequestClose={() => setShowLeaveReviewModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>Leave Request</Text>
                      <TouchableOpacity onPress={() => setShowLeaveReviewModal(false)}>
                        <X size={22} color={Colors.textLight} />
                      </TouchableOpacity>
                    </View>

                    {reviewingLeave && (
                      <>
                        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 }}>{reviewingLeave.staff_name}</Text>
                          <Text style={{ fontSize: 14, color: Colors.text, marginBottom: 4 }}>
                            {formatLeaveDate(reviewingLeave.start_date)} — {formatLeaveDate(reviewingLeave.end_date)}
                          </Text>
                          <Text style={{ fontSize: 14, color: Colors.textLight, marginBottom: 2 }}>
                            {(() => {
                              const days = Math.ceil((new Date(reviewingLeave.end_date).getTime() - new Date(reviewingLeave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                              return `${days} day${days > 1 ? 's' : ''}`;
                            })()}
                          </Text>
                          <Text style={{ fontSize: 13, color: Colors.text, marginTop: 6 }}>
                            Reason: {reviewingLeave.reason}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 }}>Note (optional)</Text>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, marginBottom: 20, minHeight: 60, textAlignVertical: 'top' }}
                          value={reviewNote}
                          onChangeText={setReviewNote}
                          placeholder="Add a note for the staff member"
                          placeholderTextColor={Colors.textLight}
                          multiline
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Pressable
                            onPress={() => handleReviewLeave('rejected')}
                            disabled={reviewSubmitting}
                            style={({ pressed }) => [{
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: reviewSubmitting ? Colors.grey[300] : pressed ? '#B91C1C' : Colors.error,
                              borderRadius: 12, paddingVertical: 14,
                            }]}
                          >
                            <CircleX size={18} color="#fff" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Reject</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleReviewLeave('approved')}
                            disabled={reviewSubmitting}
                            style={({ pressed }) => [{
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: reviewSubmitting ? Colors.grey[300] : pressed ? '#047857' : Colors.success,
                              borderRadius: 12, paddingVertical: 14,
                            }]}
                          >
                            <Check size={18} color="#fff" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Approve</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </Modal>

              {/* Leave detail modal (view message & approval/rejection reason) */}
              <Modal visible={!!leaveDetailModal} transparent animationType="fade" onRequestClose={() => setLeaveDetailModal(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>Leave details</Text>
                      <TouchableOpacity onPress={() => setLeaveDetailModal(null)}>
                        <X size={22} color={Colors.textLight} />
                      </TouchableOpacity>
                    </View>
                    {leaveDetailModal && (
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>{leaveDetailModal.staff_name}</Text>
                        <View style={{
                          backgroundColor: getLeaveStatusColor(leaveDetailModal.status) + '18',
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12,
                        }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: getLeaveStatusColor(leaveDetailModal.status), textTransform: 'capitalize' }}>
                            {leaveDetailModal.status}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: Colors.text, marginBottom: 4 }}>
                          {formatLeaveDate(leaveDetailModal.start_date)} — {formatLeaveDate(leaveDetailModal.end_date)}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 12, marginBottom: 4 }}>Message / Reason</Text>
                        <Text style={{ fontSize: 14, color: Colors.textLight, marginBottom: 12 }}>{leaveDetailModal.reason || '—'}</Text>
                        {leaveDetailModal.reviewer_note ? (
                          <>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 }}>Approval / Rejection note</Text>
                            <Text style={{ fontSize: 14, color: Colors.primary, fontStyle: 'italic', marginBottom: 8 }}>{leaveDetailModal.reviewer_note}</Text>
                          </>
                        ) : null}
                        {leaveDetailModal.reviewed_at && (
                          <Text style={{ fontSize: 12, color: Colors.textLight }}>
                            Reviewed: {new Date(leaveDetailModal.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </ScrollView>
                    )}
                  </View>
                </View>
              </Modal>
            </SafeAreaView>
          </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatListContent: {
    paddingBottom: Platform.select({
      web: 100,
      default: 20, // Reduced bottom padding to remove unused space
    }),
    // No horizontal padding - sections handle their own padding/margins
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'visible' as const,
    zIndex: 10,
  },
  greetingSection: {
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Match all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 24,
      default: 20, // Unified top padding
    }),
    paddingBottom: Platform.select({
      web: 20,
      default: 16, // Reduced bottom padding for seamless flow
    }),
    backgroundColor: Colors.background, // Match main background for unified look
    // Removed border to make it feel integrated
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    ...getFontStyles().header,
    color: Colors.text,
  },
  chatIconWrapper: {
    padding: 8,
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  chatBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 5,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  greetingName: {
    color: '#3F66AC', // Brand blue for owner name
    fontWeight: '700',
  },
  greetingSubtext: {
    fontSize: 16,
    color: Colors.textLight,
  },
  greetingBusinessName: {
    color: '#F5C754', // Brand yellow for business name
    fontWeight: '600',
  },
  kpiContainer: {
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Match all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 8,
      default: 4, // Minimal top padding for seamless flow from greeting
    }),
    paddingBottom: Platform.select({
      web: 16,
      default: 12, // Consistent bottom padding
    }),
    gap: Platform.select({
      web: 16,
      default: 0, // Remove gap on mobile, use marginBottom on cards instead
    }),
    backgroundColor: Colors.background,
  },
  kpiCard: {
    padding: Platform.select({
      web: 16,
      default: 14, // Slightly reduced padding on mobile
    }),
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: Platform.select({
      web: 1,
      default: 1.5, // Slightly thicker border on mobile for better definition
    }),
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    ...getShadowStyle(2),
    marginBottom: Platform.select({
      web: 0,
      default: 12, // Add spacing between KPI cards on mobile
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    ...getFontStyles().body,
    color: Colors.textLight,
  },
  kpiAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  kpiChange: {
    ...getFontStyles().body,
    fontWeight: '600',
  },
  kpiPeriod: {
    ...getFontStyles().caption,
    color: Colors.textLight,
    marginLeft: 4,
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
  warning: {
    color: Colors.warning,
  },
  section: {
    marginHorizontal: Platform.select({
      web: 24,
      default: 16, // Match all-invoices page padding
    }),
    marginTop: Platform.select({
      web: 16,
      default: 20, // Increased top margin for better separation
    }),
    padding: Platform.select({
      web: 16,
      default: 12, // Reduced for native mobile look
    }),
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
    borderTopWidth: 8,
    borderTopColor: Colors.grey[100],
      },
      default: {
        // Remove grey top border on mobile for cleaner look
        borderTopWidth: 0,
      },
    }),
  },
  lastSection: {
    paddingBottom: Platform.select({
      web: 32,
      default: 16, // Reduced bottom padding to remove unused space
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Platform.select({
      web: 16,
      default: 14, // Consistent margin for better separation from content
    }),
    marginTop: Platform.select({
      web: 0,
      default: 4, // Add top margin for visual separation from previous section
    }),
    paddingVertical: Platform.select({
      web: 12,
      default: 10, // Vertical padding for better definition
    }),
    paddingHorizontal: Platform.select({
      web: 0,
      default: 16, // Match all-invoices page padding
    }),
    backgroundColor: Platform.select({
      web: 'transparent',
      default: '#F8F9FA', // Slightly darker background for better distinction
    }),
    borderRadius: Platform.select({
      web: 0,
      default: 8, // Rounded corners on mobile
    }),
    borderLeftWidth: Platform.select({
      web: 0,
      default: 3, // Left border accent on mobile for clear distinction
    }),
    borderLeftColor: Platform.select({
      web: 'transparent',
      default: '#3F66AC', // Brand blue accent border
    }),
    ...Platform.select({
      web: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
      },
      default: {
        // Remove bottom border on mobile, use left accent instead
        borderBottomWidth: 0,
      },
    }),
  },
  sectionTitle: {
    ...getFontStyles().header,
    color: Colors.text,
    fontSize: Platform.select({
      web: 18,
      default: 17, // Slightly larger for better visibility
    }),
    fontWeight: '700',
    letterSpacing: Platform.select({
      web: 0,
      default: -0.2, // Slightly tighter letter spacing on mobile
    }),
  },
  notificationList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 12,
    ...getShadowStyle(1),
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentIcon: {
    backgroundColor: '#DCFCE7',
  },
  warningIcon: {
    backgroundColor: '#FEF3C7',
  },
  infoIcon: {
    backgroundColor: '#DBEAFE',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  discrepancyList: {
    gap: 12,
  },
  discrepancyItem: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    ...getShadowStyle(1),
  },
  shortageItem: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  excessItem: {
    borderColor: Colors.orange,
    backgroundColor: '#FFF7ED',
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discrepancyProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  discrepancyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discrepancyInfo: {
    flex: 1,
  },
  discrepancyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  discrepancyDiff: {
    fontSize: 14,
    fontWeight: '600',
  },
  shortageText: {
    color: Colors.error,
  },
  excessText: {
    color: Colors.orange,
  },
  supplierName: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  staffList: {
    gap: 16,
  },
  staffCard: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    ...getShadowStyle(2),
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  staffImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  staffNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffAttendance: {
    fontSize: 14,
    color: Colors.textLight,
  },
  staffStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  scoreValue: {
    color: Colors.success,
  },
  salesOverview: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
    ...getShadowStyle(2),
  },
  periodSection: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodHeader: {
    marginBottom: 8,
    flex: 1,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  periodStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  orderBadge: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
  },
  paymentMethods: {
    padding: 16,
    gap: 12,
    backgroundColor: Colors.grey[50],
  },
  paymentMethod: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    ...getShadowStyle(1),
  },
  paymentTitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  dayWiseSection: {
    padding: 16,
    backgroundColor: Colors.grey[50],
  },
  dayWiseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dayWiseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  dayName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  dayAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dayOrders: {
    fontSize: 12,
    color: Colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
});