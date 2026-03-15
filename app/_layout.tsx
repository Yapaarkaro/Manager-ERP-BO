import { useEffect, useRef, useState, useCallback } from 'react';
import { LogBox, Alert, Platform, View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import Toast from 'react-native-toast-message';
import { StatusBarProvider } from '@/contexts/StatusBarContext';
import { WebNavigationProvider } from '@/contexts/WebNavigationContext';
import { PermissionProvider, usePermissions } from '@/contexts/PermissionContext';
import { subscriptionStore } from '@/utils/subscriptionStore';
import { productStore } from '@/utils/productStore';
import { prefetchBusinessData } from '@/hooks/useBusinessData';
import { supabase, withTimeout } from '@/lib/supabase';
import InvoiceReceivedPopup from '@/components/InvoiceReceivedPopup';
import Sidebar from '@/components/Sidebar';
import HamburgerMenu from '@/components/HamburgerMenu';

LogBox.ignoreLogs([
  'Codegen didn\'t run for',
  'The action \'GO_BACK\' was not handled',
]);

// Suppress codegen warnings from console output
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Codegen didn\'t run for')) return;
  origWarn(...args);
};

// Suppress expected auth errors (stale refresh tokens) from console
const origError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0]
    : args[0]?.message ? args[0].message
    : String(args[0] ?? '');
  if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) return;
  origError(...args);
};

declare global {
  var clearAllData: (() => Promise<void>) | undefined;
}

global.clearAllData = async () => {
  await subscriptionStore.clearSubscriptionData();
};

function RouteGuard() {
  const pathname = usePathname();
  const { canAccessRoute, loading, isStaff, permissions, role } = usePermissions();
  const lastDenied = useRef('');
  const authCheckDone = useRef(false);

  // Strip query params from the browser URL to prevent PII leakage
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        const loc = window.location;
        if (loc.search) {
          window.history.replaceState(window.history.state, '', loc.pathname);
        }
      } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Routes that are used during onboarding and only need an active session (not completed onboarding)
  const onboardingAllowedRoutes = ['/edit-address-simple', '/edit-address', '/add-address', '/subscription', '/subscription-success'];

  // Protect app routes: require completed auth & onboarding
  useEffect(() => {
    if (pathname.startsWith('/auth') || pathname === '/' || pathname === '/index') return;
    if (pathname.startsWith('/admin')) return;
    if (authCheckDone.current) return;

    const isOnboardingRoute = onboardingAllowedRoutes.includes(pathname);

    let cancelled = false;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (!cancelled) router.replace('/');
          return;
        }

        // Onboarding-allowed routes only need an active session
        if (isOnboardingRoute) return;

        const { data: userRow } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!userRow?.business_id) {
          if (!cancelled) router.replace('/');
          return;
        }

        // Staff members skip the onboarding check
        if (userRow.role === 'Staff') {
          authCheckDone.current = true;
          return;
        }

        const { data: biz } = await supabase
          .from('businesses')
          .select('is_onboarding_complete')
          .eq('id', userRow.business_id)
          .maybeSingle();

        if (!biz?.is_onboarding_complete) {
          if (!cancelled) router.replace('/');
          return;
        }
        authCheckDone.current = true;
      } catch {
        if (!cancelled) router.replace('/');
      }
    };
    check();
    return () => { cancelled = true; };
  }, [pathname]);

  // Reset auth check when user logs out (navigates to auth)
  useEffect(() => {
    if (pathname === '/' || pathname === '/index' || pathname.startsWith('/auth')) {
      authCheckDone.current = false;
    }
  }, [pathname]);

  // Permission-based route guard for staff
  useEffect(() => {
    if (loading || !isStaff) return;
    if (permissions.length === 0) return;
    if (pathname.startsWith('/auth') || pathname === '/' || pathname === '/index') return;
    const alwaysAllowed = ['/dashboard', '/settings', '/chat', '/notifications'];
    if (alwaysAllowed.some(r => pathname === r || pathname.startsWith(r + '/'))) return;
    if (!canAccessRoute(pathname) && lastDenied.current !== pathname) {
      lastDenied.current = pathname;
      Alert.alert('Access Denied', 'You do not have permission to access this section.');
      router.replace('/dashboard');
    }
  }, [pathname, loading, isStaff, permissions, canAccessRoute]);

  return null;
}

const isWeb = Platform.OS === 'web';

const AUTH_ROUTES = ['/auth/', '/index', '/admin/'];
function shouldShowSidebar(pathname: string): boolean {
  if (pathname === '/' || pathname === '/index') return false;
  return !AUTH_ROUTES.some(r => pathname.startsWith(r));
}

let _deferredInstallPrompt: any = null;
let _pwaInstallListeners: Array<(installable: boolean) => void> = [];

export function getPwaInstallPrompt() { return _deferredInstallPrompt; }
export function isPwaInstallable() { return _deferredInstallPrompt !== null; }
export function onPwaInstallChange(cb: (installable: boolean) => void) {
  _pwaInstallListeners.push(cb);
  return () => { _pwaInstallListeners = _pwaInstallListeners.filter(l => l !== cb); };
}
export async function triggerPwaInstall(): Promise<boolean> {
  if (!_deferredInstallPrompt) return false;
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    _deferredInstallPrompt = null;
    _pwaInstallListeners.forEach(cb => cb(false));
  }
  return outcome === 'accepted';
}

function useWebPWA() {
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    if (document.getElementById('pwa-manifest')) return;
    const manifestLink = document.createElement('link');
    manifestLink.id = 'pwa-manifest';
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#2c5282';
    document.head.appendChild(themeColor);
    const webAppMeta = document.createElement('meta');
    webAppMeta.name = 'mobile-web-app-capable';
    webAppMeta.content = 'yes';
    document.head.appendChild(webAppMeta);
    const appleStatus = document.createElement('meta');
    appleStatus.name = 'apple-mobile-web-app-status-bar-style';
    appleStatus.content = 'default';
    document.head.appendChild(appleStatus);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      _deferredInstallPrompt = e;
      _pwaInstallListeners.forEach(cb => cb(true));
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      _deferredInstallPrompt = null;
      _pwaInstallListeners.forEach(cb => cb(false));
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);
}

function useWebGlobalStyles() {
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const id = 'erp-web-global-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Suppress browser default focus outlines on all inputs – custom focus rings are applied via React Native styles */
      input, textarea, select, [contenteditable] {
        outline: none !important;
        outline-width: 0 !important;
      }
      input:focus, textarea:focus, select:focus, [contenteditable]:focus {
        outline: none !important;
        outline-width: 0 !important;
      }
      /* Smoother scrollbars for web */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      /* Remove tap highlight on mobile web */
      * { -webkit-tap-highlight-color: transparent; }
    `;
    document.head.appendChild(style);
  }, []);
}

const SIDEBAR_BREAKPOINT = 768;

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);
  useEffect(() => {
    if (!isWeb) return;
    const handler = ({ window: w }: { window: { width: number } }) => setWidth(w.width);
    const sub = Dimensions.addEventListener('change', handler);
    return () => sub?.remove();
  }, []);
  return width;
}

function usePreventBackspaceNavigation() {
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

export default function RootLayout() {
  useFrameworkReady();
  useWebGlobalStyles();
  useWebPWA();
  usePreventBackspaceNavigation();
  const pathname = usePathname();
  const windowWidth = useWindowWidth();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSidebarCollapseChange = useCallback((collapsed: boolean, width: number) => {
    setSidebarWidth(width);
  }, []);

  const isWideScreen = windowWidth > SIDEBAR_BREAKPOINT;
  const showSidebar = isWeb && shouldShowSidebar(pathname) && isWideScreen;
  const showHamburgerBar = isWeb && shouldShowSidebar(pathname) && !isWideScreen;

  const [invoiceLinkData, setInvoiceLinkData] = useState<{
    invoiceId: string;
    businessId: string;
    type: string;
    businessName?: string;
    invoiceNumber?: string;
    amount?: number;
  } | null>(null);

  const handleDeepLink = useCallback((url: string) => {
    try {
      // Handle both native (manager://invoice-link?...) and web (https://app.getmanager.in/invoice-link?...) URLs
      let params: Record<string, string> = {};
      let isInvoiceLink = false;

      try {
        const urlObj = new URL(url);
        if (urlObj.pathname === '/invoice-link' || urlObj.pathname === '//invoice-link') {
          isInvoiceLink = true;
          urlObj.searchParams.forEach((val, key) => { params[key] = val; });
        }
      } catch {
        // Not a full URL, try Linking.parse for native scheme
      }

      if (!isInvoiceLink) {
        const parsed = Linking.parse(url);
        if (parsed.path === 'invoice-link' || parsed.hostname === 'invoice-link') {
          isInvoiceLink = true;
          params = (parsed.queryParams || {}) as Record<string, string>;
        }
      }

      if (isInvoiceLink && params.invoice_id && params.business_id) {
        setInvoiceLinkData({
          invoiceId: params.invoice_id,
          businessId: params.business_id,
          type: params.type || 'sale',
          businessName: params.business_name,
          invoiceNumber: params.invoice_number,
          amount: params.amount ? Number(params.amount) : undefined,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    }).catch(() => {});

    // Listen for incoming deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if a session exists before attempting refresh to avoid
        // AuthUnknownError when the auth endpoint returns non-JSON (e.g. HTML error pages)
        const { data: { session: existingSession } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'Layout: getSession'
        );
        if (!existingSession?.user) return;

        let session = existingSession;
        try {
          const { data: refreshed, error: refreshError } = await withTimeout(
            supabase.auth.refreshSession(),
            10000,
            'Layout: refreshSession'
          );
          if (refreshError) {
            const msg = refreshError.message || '';
            if (msg.includes('Refresh Token') || msg.includes('Invalid Refresh Token')) {
              await supabase.auth.signOut().catch(() => {});
              return;
            }
          }
          if (refreshed?.session) {
            session = refreshed.session;
          }
        } catch {
          // Refresh failed (e.g. non-JSON response or timeout) — continue with existing session
        }
        if (!session?.user) return;

        const { data: userData } = await withTimeout(
          Promise.resolve(
            supabase.from('users').select('business_id').eq('id', session.user.id).maybeSingle()
          ),
          5000,
          'Layout: check business'
        ) as { data: { business_id: string } | null };

        if (userData?.business_id) {
          await Promise.allSettled([
            withTimeout(productStore.loadProductsFromBackend(), 15000, 'Products prefetch'),
            withTimeout(prefetchBusinessData(), 15000, 'Business data prefetch'),
          ]);
        }
      } catch {
        // Auth check failed or timed out - user will be directed to login
      }
    };

    initializeData();
  }, []);

  const stackElement = (
        <Stack screenOptions={{ headerShown: false, animation: isWeb ? 'none' : undefined }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/mobile" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/gstin-pan" />
        <Stack.Screen name="auth/gstin-pan-otp" />
        <Stack.Screen name="auth/business-details" />
        <Stack.Screen name="auth/business-address" />
        <Stack.Screen name="auth/business-address-manual" />
        <Stack.Screen name="auth/address-confirmation" />
        <Stack.Screen name="auth/banking-details" />
        <Stack.Screen name="auth/bank-accounts" />
        <Stack.Screen name="auth/final-setup" />
        <Stack.Screen name="auth/discover-businesses" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/staff-verify" />
        <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sales" />
        <Stack.Screen name="all-invoices" />
        <Stack.Screen name="returns" />
        <Stack.Screen name="return-details" />
        <Stack.Screen name="new-sale/index" />
        <Stack.Screen name="new-sale/scanner" />
        <Stack.Screen name="new-sale/cart" />
        <Stack.Screen name="new-sale/customer-details" />
        <Stack.Screen name="new-sale/payment" />
        <Stack.Screen name="new-sale/success" />
        <Stack.Screen name="locations/branches" />
        <Stack.Screen name="locations/warehouses" />
        <Stack.Screen name="locations/add-branch" />
        <Stack.Screen name="locations/add-warehouse" />
        <Stack.Screen name="locations/branch-details" />
        <Stack.Screen name="locations/warehouse-details" />
        <Stack.Screen name="new-return/index" />
        <Stack.Screen name="new-return/scan-invoice" />
        <Stack.Screen name="new-return/select-items" />
        <Stack.Screen name="new-return/return-reasons" />
        <Stack.Screen name="new-return/refund-method" />
        <Stack.Screen name="new-return/confirmation" />
        <Stack.Screen name="new-return/success" />
        <Stack.Screen name="inventory/low-stock" />
        <Stack.Screen name="inventory/product-details" />
        <Stack.Screen name="inventory/stock-discrepancies" />
        <Stack.Screen name="inventory/discrepancy-details" />
        <Stack.Screen name="inventory/index" />
        <Stack.Screen name="inventory/scan-product" />
        <Stack.Screen name="inventory/manual-product" />
        <Stack.Screen name="inventory/stock-management" />
        <Stack.Screen name="inventory/stock-in" />
        <Stack.Screen name="inventory/stock-in/manual" />
        <Stack.Screen name="inventory/stock-in/po-search" />
        <Stack.Screen name="inventory/stock-in/qr-scan" />
        <Stack.Screen name="inventory/stock-in/confirmation" />
        <Stack.Screen name="inventory/stock-in/verify-stock" />
        <Stack.Screen name="inventory/stock-in/stock-confirmation" />
        <Stack.Screen name="inventory/stock-in/invoice-input" />
        <Stack.Screen name="inventory/stock-in/discrepancy-report" />
        <Stack.Screen name="invoice-details" />
        <Stack.Screen name="receivables" />
        <Stack.Screen name="receivables/customer-details" />
        <Stack.Screen name="receivables/receive-payment" />
        <Stack.Screen name="receivables/collect-payment" />
        <Stack.Screen name="receivables/payment-success" />
        <Stack.Screen name="payables" />
        <Stack.Screen name="payables/supplier-details" />
        <Stack.Screen name="payables/make-payment" />
        <Stack.Screen name="payables/process-payment" />
        <Stack.Screen name="payables/payment-success" />
        <Stack.Screen name="payment-selection" />
        <Stack.Screen name="people/staff" />
        <Stack.Screen name="people/add-staff" />
        <Stack.Screen name="people/customers" />
        <Stack.Screen name="people/customer-details" />
        <Stack.Screen name="people/customer-chat" />
        <Stack.Screen name="chat/index" />
        <Stack.Screen name="chat/conversation" />
        <Stack.Screen name="chat/new-conversation" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notifications/notify-staff" />
        <Stack.Screen name="notifications/notify-owner" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="reports/payment-details" />
        <Stack.Screen name="reports/daily-invoices" />
        <Stack.Screen name="admin/email-verify" options={{ gestureEnabled: false }} />
        <Stack.Screen name="admin/dashboard" options={{ gestureEnabled: false }} />
        <Stack.Screen name="admin/search" />
        <Stack.Screen name="+not-found" />
      </Stack>
  );

  return (
    <StatusBarProvider>
      <PermissionProvider>
      <RouteGuard />
      <WebNavigationProvider>
        {showSidebar ? (
          <View style={webStyles.shell}>
            <Sidebar
              onNavigate={(route: string) => router.push(route as any)}
              currentRoute={pathname}
              onCollapseChange={handleSidebarCollapseChange}
            />
            <View style={[webStyles.content, { marginLeft: sidebarWidth }]}>
              {stackElement}
            </View>
          </View>
        ) : showHamburgerBar ? (
          <View style={webStyles.mobileShell}>
            <View style={webStyles.mobileTopBar}>
              <TouchableOpacity
                style={webStyles.hamburgerBtn}
                onPress={() => setShowMobileMenu(true)}
                activeOpacity={0.7}
              >
                <View style={webStyles.hamburgerLine} />
                <View style={webStyles.hamburgerLine} />
                <View style={webStyles.hamburgerLine} />
              </TouchableOpacity>
              <Text style={webStyles.topBarTitle}>Manager</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={webStyles.mobileContent}>
              {stackElement}
            </View>
            <HamburgerMenu
              visible={showMobileMenu}
              onClose={() => setShowMobileMenu(false)}
              onNavigate={(route: string) => {
                setShowMobileMenu(false);
                router.push(route as any);
              }}
            />
          </View>
        ) : (
          stackElement
        )}
      <Toast />
      <InvoiceReceivedPopup
        visible={!!invoiceLinkData}
        invoiceId={invoiceLinkData?.invoiceId || ''}
        businessId={invoiceLinkData?.businessId || ''}
        invoiceType={invoiceLinkData?.type || 'sale'}
        businessName={invoiceLinkData?.businessName}
        invoiceNumber={invoiceLinkData?.invoiceNumber}
        amount={invoiceLinkData?.amount}
        onDismiss={() => setInvoiceLinkData(null)}
        onViewDetails={() => {
          if (invoiceLinkData) {
            router.push({
              pathname: '/invoice-details',
              params: { invoiceId: invoiceLinkData.invoiceId },
            } as any);
          }
          setInvoiceLinkData(null);
        }}
        onAddToPurchases={() => {
          if (invoiceLinkData) {
            router.push('/purchasing/purchases' as any);
          }
          setInvoiceLinkData(null);
        }}
      />
      </WebNavigationProvider>
      </PermissionProvider>
    </StatusBarProvider>
  );
}

const webStyles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    ...(isWeb ? { height: '100vh' as any } : {}),
  },
  content: {
    flex: 1,
    ...(isWeb ? { transition: 'margin-left 0.3s ease' as any, minWidth: 0 } : {}),
  },
  mobileShell: {
    flex: 1,
    ...(isWeb ? { height: '100vh' as any } : {}),
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...(isWeb ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#374151',
    marginVertical: 2,
    borderRadius: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  mobileContent: {
    flex: 1,
    ...(isWeb ? { overflow: 'auto' as any } : {}),
  },
});
