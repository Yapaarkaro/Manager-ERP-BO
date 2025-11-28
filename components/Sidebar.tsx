import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Chrome as Home, 
  CreditCard, 
  ShoppingCart, 
  RotateCcw, 
  Receipt, 
  FileText, 
  Package, 
  ShoppingBag, 
  Users, 
  MapPin, 
  Building2, 
  Warehouse, 
  ChartBar as BarChart3, 
  Megaphone, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  IndianRupee,
  ChevronLeft,
} from 'lucide-react-native';

interface SidebarProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
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
    route: '/all-invoices',
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
    id: 'bank-accounts',
    title: 'Bank Accounts & Cash',
    icon: CreditCard,
    route: '/bank-accounts',
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

export default function Sidebar({ onNavigate, currentRoute }: SidebarProps) {
  // Keep all sections with subsections expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(menuSections.filter(s => s.subsections && s.subsections.length > 0).map(s => s.id))
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width] = useState(new Animated.Value(280));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleCollapse = () => {
    const toValue = isCollapsed ? 280 : 80;
    setIsCollapsed(!isCollapsed);
    
    Animated.timing(width, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleNavigation = (route: string) => {
    onNavigate(route);
  };

  const renderMenuItem = (section: MenuSection) => {
    const IconComponent = section.icon;
    const isExpanded = expandedSections.has(section.id);
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const isActive = currentRoute === section.route;

    return (
      <View key={section.id} style={styles.menuItem}>
        <TouchableOpacity
          style={[styles.menuItemHeader, isActive && styles.menuItemActive]}
          onPress={() => {
            if (hasSubsections && !isCollapsed) {
              toggleSection(section.id);
            } else if (section.route) {
              handleNavigation(section.route);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuItemIcon, isActive && styles.menuItemIconActive]}>
              <IconComponent size={20} color={isActive ? "#ffffff" : "#64748b"} />
            </View>
            {!isCollapsed && (
              <>
                <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                  {section.title}
                </Text>
                {hasSubsections && (
                  <View style={styles.expandIcon}>
                    {isExpanded ? (
                      <ChevronDown size={16} color={isActive ? "#ffffff" : "#64748b"} />
                    ) : (
                      <ChevronRight size={16} color={isActive ? "#ffffff" : "#64748b"} />
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
        
        {hasSubsections && isExpanded && !isCollapsed && (
          <View style={styles.subsections}>
            {section.subsections.map((subsection) => (
              <TouchableOpacity
                key={subsection.id}
                style={styles.subsectionItem}
                onPress={() => handleNavigation(subsection.route)}
                activeOpacity={0.7}
              >
                <Text style={styles.subsectionText}>{subsection.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Only show sidebar on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Animated.View style={[styles.sidebar, { width }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {!isCollapsed && <Text style={styles.title}>Menu</Text>}
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={toggleCollapse}
            activeOpacity={0.7}
          >
            {isCollapsed ? (
              <ChevronRight size={20} color="#64748b" />
            ) : (
              <ChevronLeft size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {menuSections.map(renderMenuItem)}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    height: '100vh',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        zIndex: 1000,
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  collapseButton: {
    padding: 4,
  },
  menuContent: {
    flex: 1,
  },
  menuItem: {
    marginBottom: 4,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  menuItemActive: {
    backgroundColor: '#3f66ac',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  menuItemIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  menuItemTextActive: {
    color: '#ffffff',
  },
  expandIcon: {
    marginLeft: 8,
  },
  subsections: {
    paddingLeft: 48,
    paddingTop: 4,
  },
  subsectionItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subsectionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
});

