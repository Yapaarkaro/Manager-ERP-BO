import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Chrome as Home, CreditCard, ShoppingCart, RotateCcw, Receipt, FileText, Package, ShoppingBag, Users, MapPin, Building2, Warehouse, ChartBar as BarChart3, Megaphone, Settings, ChevronDown, ChevronRight, IndianRupee, Building } from 'lucide-react-native';

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
  subsections?: {
    id: string;
    title: string;
    route: string;
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
    subsections: [
      { id: 'sales', title: 'Sales', route: '/sales' },
      { id: 'returns', title: 'Returns', route: '/returns' },
      { id: 'all-invoices', title: 'All Invoices', route: '/all-invoices' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: Package,
    route: '/inventory',
  },
  {
    id: 'purchasing',
    title: 'Purchasing',
    icon: ShoppingCart,
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
      { id: 'customers', title: 'Customers', route: '/people/customers' },
      { id: 'staff', title: 'Staff', route: '/people/staff' },
    ],
  },
  {
    id: 'banks',
    title: 'Banks',
    icon: Building,
    route: '/banks',
  },
  {
    id: 'cash',
    title: 'Cash',
    icon: CreditCard,
    route: '/cash',
  },
  {
    id: 'locations',
    title: 'Locations',
    icon: MapPin,
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
  },
  {
    id: 'marketing',
    title: 'Marketing',
    icon: Megaphone,
    route: '/marketing',
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
        
        <View style={styles.menuContainer}>
          <SafeAreaView style={styles.menuHeaderSafeArea}>
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
          </SafeAreaView>

          <ScrollView
            style={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections.map(renderMenuItem)}
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
  menuHeaderSafeArea: {
    backgroundColor: '#ffffff',
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