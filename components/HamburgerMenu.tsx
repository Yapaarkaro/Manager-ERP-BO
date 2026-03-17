import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Chrome as Home, CreditCard, ShoppingCart, RotateCcw, Receipt, FileText, Package, ShoppingBag, Users, MapPin, Building2, Warehouse, ChartBar as BarChart3, Megaphone, Settings, ChevronDown, ChevronRight, IndianRupee, Building, Wallet, MessageSquare, Briefcase, CalendarDays } from 'lucide-react-native';
import { usePermissions } from '@/contexts/PermissionContext';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

interface MenuSection {
  id: string;
  title: string;
  icon: any;
  route?: string;
  permission?: string;
  subsections?: {
    id: string;
    title: string;
    route: string;
    permission?: string;
  }[];
}

const menuSections: MenuSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    route: '/dashboard',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: IndianRupee,
    route: '/all-invoices',
    permission: 'sales',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: Package,
    route: '/inventory',
    permission: 'inventory',
  },
  {
    id: 'purchasing',
    title: 'Purchasing',
    icon: ShoppingCart,
    permission: 'inventory',
    subsections: [
      { id: 'purchases', title: 'Purchases', route: '/purchasing/purchases' },
      { id: 'suppliers', title: 'Suppliers', route: '/purchasing/suppliers' },
    ],
  },
  {
    id: 'people',
    title: 'People',
    icon: Users,
    subsections: [
      { id: 'customers', title: 'Customers', route: '/people/customers', permission: 'customer_management' },
      { id: 'staff', title: 'Staff', route: '/people/staff', permission: 'staff_management' },
    ],
  },
  {
    id: 'bank-accounts',
    title: 'Bank Accounts',
    icon: CreditCard,
    route: '/bank-accounts',
    permission: 'payment_processing',
  },
  {
    id: 'cash-accounts',
    title: 'Cash Accounts',
    icon: Wallet,
    route: '/cash-accounts',
    permission: 'payment_processing',
  },
  {
    id: 'locations',
    title: 'Locations',
    icon: MapPin,
    permission: 'inventory',
    subsections: [
      { id: 'branches', title: 'Branches', route: '/locations/branches' },
      { id: 'warehouses', title: 'Warehouses', route: '/locations/warehouses' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    route: '/reports',
    permission: 'reports',
  },
  {
    id: 'services',
    title: 'Marketing & Services',
    icon: Briefcase,
    permission: 'master_access',
    subsections: [
      { id: 'marketing', title: 'Marketing', route: '/marketing' },
      { id: 'tax-compliance', title: 'Tax Compliance', route: '/services/coming-soon?service=Tax Compliance' },
      { id: 'business-consultation', title: 'Business Consultation', route: '/services/coming-soon?service=Business Consultation' },
      { id: 'working-capital', title: 'Working Capital', route: '/services/coming-soon?service=Working Capital Assistance' },
    ],
  },
  {
    id: 'leave-log',
    title: 'Leave Log',
    icon: CalendarDays,
    route: '/leave-log',
    permission: 'staff_management',
  },
  {
    id: 'chat',
    title: 'Chat',
    icon: MessageSquare,
    route: '/chat',
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    route: '/settings',
  },
];

export default function HamburgerMenu({ visible, onClose, onNavigate }: HamburgerMenuProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { hasPermission } = usePermissions();
  const insets = useSafeAreaInsets();

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleNavigation = (route: string) => {
    onNavigate(route);
    onClose();
  };

  const renderMenuItem = (section: MenuSection) => {
    const IconComponent = section.icon;
    const isExpanded = expandedSections.has(section.id);
    const hasSubsections = section.subsections && section.subsections.length > 0;

    return (
      <View key={section.id} style={styles.menuItem}>
        <TouchableOpacity
          style={styles.menuItemHeader}
          onPress={() => {
            if (hasSubsections) {
              toggleSection(section.id);
            } else if (section.route) {
              handleNavigation(section.route);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuItemIcon}>
              <IconComponent size={20} color="#64748b" />
            </View>
            <Text style={styles.menuItemText}>{section.title}</Text>
          </View>
          {hasSubsections && (
            <View style={styles.expandIcon}>
              {isExpanded ? (
                <ChevronDown size={16} color="#64748b" />
              ) : (
                <ChevronRight size={16} color="#64748b" />
              )}
            </View>
          )}
        </TouchableOpacity>

        {hasSubsections && isExpanded && (
          <View style={styles.submenu}>
            {section.subsections!.map((subsection) => (
              <TouchableOpacity
                key={subsection.id}
                style={styles.submenuItem}
                onPress={() => handleNavigation(subsection.route)}
                activeOpacity={0.7}
              >
                <Text style={styles.submenuItemText}>{subsection.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        
        <View style={[
          styles.menuContainer,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0),
            paddingBottom: insets.bottom,
          },
        ]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections
              .filter(s => !s.permission || hasPermission(s.permission))
              .map(section => {
                if (section.subsections) {
                  const filteredSubs = section.subsections.filter(
                    sub => !sub.permission || hasPermission(sub.permission)
                  );
                  if (filteredSubs.length === 0) return null;
                  return renderMenuItem({ ...section, subsections: filteredSubs });
                }
                return renderMenuItem(section);
              })}
          </ScrollView>
        </View>
        
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  menuContainer: {
    width: 280,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  overlayTouchable: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    marginVertical: 2,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  expandIcon: {
    marginLeft: 8,
  },
  submenu: {
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
  },
  submenuItem: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginLeft: 40,
  },
  submenuItemText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});