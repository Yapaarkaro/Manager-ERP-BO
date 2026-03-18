import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Route → permission mapping
// ---------------------------------------------------------------------------

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/sales': 'sales',
  '/all-invoices': 'sales',
  '/invoice-details': 'sales',
  '/transaction-details': 'sales',
  '/new-sale': 'sales',
  '/new-sale/index': 'sales',
  '/new-sale/scanner': 'sales',
  '/new-sale/cart': 'sales',
  '/new-sale/customer-details': 'sales',
  '/new-sale/payment': 'sales',
  '/new-sale/success': 'sales',

  '/inventory': 'inventory',
  '/inventory/index': 'inventory',
  '/inventory/scan-product': 'inventory',
  '/inventory/manual-product': 'inventory',
  '/inventory/product-details': 'inventory',
  '/inventory/stock-management': 'inventory',
  '/inventory/low-stock': 'inventory',
  '/inventory/stock-discrepancies': 'inventory',
  '/inventory/discrepancy-details': 'inventory',
  '/inventory/stock-in': 'inventory',
  '/inventory/stock-in/manual': 'inventory',
  '/inventory/stock-in/confirmation': 'inventory',
  '/inventory/stock-out': 'inventory',
  '/inventory/stock-out/scan-product': 'inventory',
  '/inventory/stock-out/select-products': 'inventory',
  '/inventory/stock-out/manual-product': 'inventory',
  '/inventory/stock-out/confirmation': 'inventory',
  '/inventory/stock-out/success': 'inventory',
  '/inventory/stock-out/stock-details': 'inventory',
  '/inventory/write-offs': 'inventory',
  '/inventory/write-off-details': 'inventory',

  '/purchasing/purchases': 'inventory',
  '/purchasing/suppliers': 'inventory',
  '/purchasing/supplier-details': 'inventory',
  '/chat/conversation': 'inventory',
  '/purchasing/add-supplier': 'inventory',
  '/purchasing/add-purchase-invoice': 'inventory',
  '/purchasing/invoice-details': 'inventory',
  '/purchasing/po-details': 'inventory',
  '/purchasing/po-success': 'inventory',

  '/returns': 'inventory',
  '/return-details': 'inventory',
  '/new-return': 'inventory',
  '/new-return/index': 'inventory',
  '/new-return/confirmation': 'inventory',
  '/new-return/success': 'inventory',

  '/locations/branches': 'inventory',
  '/locations/warehouses': 'inventory',
  '/locations/add-branch': 'inventory',
  '/locations/add-warehouse': 'inventory',
  '/locations/branch-details': 'inventory',
  '/locations/warehouse-details': 'inventory',

  '/people/customers': 'customer_management',
  '/people/customer-details': 'customer_management',
  '/people/add-customer': 'customer_management',

  '/receivables': 'payment_processing',
  '/receivables/customer-details': 'payment_processing',
  '/receivables/collect-payment': 'payment_processing',
  '/receivables/payment-success': 'payment_processing',
  '/payables': 'payment_processing',
  '/payables/supplier-details': 'payment_processing',
  '/payables/process-payment': 'payment_processing',
  '/payables/payment-success': 'payment_processing',
  '/bank-accounts': 'payment_processing',
  '/add-bank-account': 'payment_processing',
  '/bank-details': 'payment_processing',
  '/banks': 'payment_processing',
  '/cash-accounts': 'payment_processing',
  '/cash-details': 'payment_processing',
  '/edit-cash-balance': 'payment_processing',
  '/payment-selection': 'payment_processing',
  '/expenses/add-expense': 'payment_processing',
  '/expenses/income-expense-toggle': 'payment_processing',
  '/expenses/success': 'payment_processing',

  '/reports': 'reports',
  '/reports/daily-invoices': 'reports',
  '/reports/payment-details': 'reports',

  '/people/staff': 'staff_management',
  '/people/staff-details': 'staff_management',
  '/people/add-staff': 'staff_management',

  '/marketing': 'master_access',
  '/marketing/index': 'master_access',
  '/subscriptions': 'master_access',
};

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface PermissionContextType {
  role: 'owner' | 'staff' | null;
  permissions: string[];
  isOwner: boolean;
  isStaff: boolean;
  loading: boolean;
  staffId: string | null;
  staffName: string | null;
  staffLocationId: string | null;
  staffBusinessId: string | null;
  hasPermission: (perm: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    return {
      role: 'owner' as const,
      permissions: [] as string[],
      isOwner: true,
      isStaff: false,
      loading: false,
      staffId: null,
      staffName: null,
      staffLocationId: null,
      staffBusinessId: null,
      hasPermission: () => true,
      canAccessRoute: () => true,
      refreshPermissions: async () => {},
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffLocationId, setStaffLocationId] = useState<string | null>(null);
  const [staffBusinessId, setStaffBusinessId] = useState<string | null>(null);
  const staffIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const subscribeToStaffChanges = useCallback((staffId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = supabase
      .channel(`staff-perms-${staffId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff', filter: `id=eq.${staffId}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.permissions) {
            setPermissions(updated.permissions);
          }
          if (updated?.is_deleted) {
            setRole(null);
            setPermissions([]);
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!userRow?.business_id) {
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      const userRole = (userRow.role || 'Owner').toLowerCase();
      if (userRole === 'staff') {
        const rawPhone = (session.user.phone || '').replace(/\D/g, '');
        const phone = rawPhone.slice(-10);
        let staffRows: any[] | null = null;
        const { data: exact } = await supabase
          .from('staff')
          .select('*')
          .eq('business_id', userRow.business_id)
          .eq('mobile', phone);
        staffRows = exact;
        if (!staffRows?.length && phone.length >= 10) {
          const { data: suffix } = await supabase
            .from('staff')
            .select('*')
            .eq('business_id', userRow.business_id)
            .ilike('mobile', '%' + phone);
          staffRows = suffix;
        }

        const staffRow = (staffRows || []).find((s: any) => !s.is_deleted) || staffRows?.[0];
        setRole('staff');
        setPermissions(staffRow?.permissions || []);
        setStaffId(staffRow?.id || null);
        setStaffName(staffRow?.name || null);
        setStaffLocationId(staffRow?.location_id || null);
        setStaffBusinessId(userRow.business_id);

        if (staffRow?.id && staffRow.id !== staffIdRef.current) {
          staffIdRef.current = staffRow.id;
          subscribeToStaffChanges(staffRow.id);
        }
      } else {
        setRole('owner');
        setPermissions([]);
      }
    } catch (e) {
      console.error('PermissionContext: failed to load', e);
      setRole('owner');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [subscribeToStaffChanges]);

  useEffect(() => {
    loadPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadPermissions();
      } else {
        setRole(null);
        setPermissions([]);
        staffIdRef.current = null;
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [loadPermissions]);

  const isOwner = role === 'owner';
  const isStaff = role === 'staff';

  const hasPermission = useCallback(
    (perm: string) => {
      if (role === 'owner') return true;
      if (permissions.includes('master_access')) return true;
      return permissions.includes(perm);
    },
    [role, permissions],
  );

  const canAccessRoute = useCallback(
    (route: string) => {
      if (role === 'owner') return true;
      if (permissions.includes('master_access')) return true;

      const clean = route.split('?')[0];

      const requiredPerm = ROUTE_PERMISSIONS[clean];
      if (!requiredPerm) return true;
      return permissions.includes(requiredPerm);
    },
    [role, permissions],
  );

  const value = useMemo<PermissionContextType>(
    () => ({ role, permissions, isOwner, isStaff, loading, staffId, staffName, staffLocationId, staffBusinessId, hasPermission, canAccessRoute, refreshPermissions: loadPermissions }),
    [role, permissions, isOwner, isStaff, loading, staffId, staffName, staffLocationId, staffBusinessId, hasPermission, canAccessRoute, loadPermissions],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
