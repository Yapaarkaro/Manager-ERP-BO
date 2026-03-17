import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePermissions } from '@/contexts/PermissionContext';
import { 
  X, 
  LayoutDashboard, 
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
  Wallet,
  MessageSquare,
  Briefcase,
  CalendarDays,
} from 'lucide-react-native';

interface SidebarProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
  onCollapseChange?: (isCollapsed: boolean, width: number) => void;
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
    icon: LayoutDashboard,
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

function Sidebar({ onNavigate, currentRoute, onCollapseChange }: SidebarProps) {
  const { hasPermission } = usePermissions();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(menuSections.filter(s => s.subsections && s.subsections.length > 0).map(s => s.id))
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width] = useState(new Animated.Value(280));
  const [showSubsectionModal, setShowSubsectionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<MenuSection | null>(null);

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
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    Animated.timing(width, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // Notify parent of collapse state change
      if (onCollapseChange) {
        onCollapseChange(newCollapsedState, toValue);
      }
    });
    
    // Also notify immediately for instant UI updates
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState, toValue);
    }
  };

  // Notify parent of initial state
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed, 280);
    }
  }, []);

  const handleNavigation = (route: string) => {
    if (Platform.OS === 'web') {
      router.push(route as any);
    } else {
      onNavigate(route);
    }
  };

  const handleSubsectionSelect = (section: MenuSection, subsectionRoute: string) => {
    setShowSubsectionModal(false);
    setSelectedSection(null);
    handleNavigation(subsectionRoute);
  };

  const handleSectionClick = (section: MenuSection) => {
    const hasSubsections = section.subsections && section.subsections.length > 0;
    
    if (hasSubsections && isCollapsed) {
      // Show modal for subsection selection when collapsed
      setSelectedSection(section);
      setShowSubsectionModal(true);
    } else if (hasSubsections && !isCollapsed) {
      // Toggle expansion when expanded
      toggleSection(section.id);
    } else if (section.route) {
      // Navigate directly if no subsections
      handleNavigation(section.route);
    }
  };

  const renderMenuItem = (section: MenuSection) => {
    const IconComponent = section.icon;
    const isExpanded = expandedSections.has(section.id);
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const isActive = currentRoute === section.route || 
      (hasSubsections && section.subsections?.some(sub => currentRoute === sub.route));

    return (
      <View key={section.id} style={styles.menuItem}>
        <TouchableOpacity
          style={[styles.menuItemHeader, isActive && styles.menuItemActive]}
          onPress={() => handleSectionClick(section)}
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
            style={[styles.collapseButton, isCollapsed && styles.collapseButtonCollapsed]}
            onPress={toggleCollapse}
            activeOpacity={0.7}
          >
            {isCollapsed ? (
              <ChevronRight size={18} color="#3f66ac" />
            ) : (
              <ChevronLeft size={18} color="#64748b" />
            )}
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
      </SafeAreaView>

      {/* Subsection Selection Modal */}
      <Modal
        visible={showSubsectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSubsectionModal(false);
          setSelectedSection(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSection?.title || 'Select Section'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowSubsectionModal(false);
                  setSelectedSection(null);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedSection?.subsections?.map((subsection) => {
                const SubsectionIcon = selectedSection.icon;
                const isSubsectionActive = currentRoute === subsection.route;
                
                return (
                  <TouchableOpacity
                    key={subsection.id}
                    style={[
                      styles.modalItem,
                      isSubsectionActive && styles.modalItemActive
                    ]}
                    onPress={() => handleSubsectionSelect(selectedSection, subsection.route)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalItemLeft}>
                      <View style={[styles.modalItemIcon, isSubsectionActive && styles.modalItemIconActive]}>
                        <SubsectionIcon size={18} color={isSubsectionActive ? "#ffffff" : "#64748b"} />
                      </View>
                      <Text style={[
                        styles.modalItemText,
                        isSubsectionActive && styles.modalItemTextActive
                      ]}>
                        {subsection.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

export default React.memo(Sidebar);

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
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  collapseButtonCollapsed: {
    backgroundColor: '#ffffff',
    borderColor: '#3f66ac',
    borderWidth: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    maxHeight: 400,
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemActive: {
    backgroundColor: '#3f66ac',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  modalItemIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
  modalItemTextActive: {
    color: '#ffffff',
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

