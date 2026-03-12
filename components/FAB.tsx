import React, { useState, useRef } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { usePermissions } from '@/contexts/PermissionContext';
import {
  Plus,
  ShoppingCart,
  RotateCcw,
  Package,
  IndianRupee,
  Bell,
  Briefcase,
  Wallet,
} from 'lucide-react-native';

interface FABProps {
  onAction?: (action: string) => void;
  onExpandedChange?: (isExpanded: boolean) => void;
  hiddenActions?: string[];
}

interface FABAction {
  id: string;
  title: string;
  icon: any;
  color: string;
  backgroundColor: string;
}

const ownerFabActions: FABAction[] = [
  { id: 'notify-staff', title: 'Notify Staff', icon: Bell, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'expense', title: 'Income/Expense', icon: IndianRupee, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'stock', title: 'Stock', icon: Package, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'payments', title: 'Payment', icon: Wallet, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'return', title: 'Return', icon: RotateCcw, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'new-sale', title: 'New Sale', icon: ShoppingCart, color: '#ffffff', backgroundColor: '#3f66ac' },
];

const staffFabActions: FABAction[] = [
  { id: 'notify-owner', title: 'Notify Owner', icon: Briefcase, color: '#ffffff', backgroundColor: '#059669' },
  { id: 'expense', title: 'Income/Expense', icon: IndianRupee, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'stock', title: 'Stock', icon: Package, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'payments', title: 'Payment', icon: Wallet, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'return', title: 'Return', icon: RotateCcw, color: '#ffffff', backgroundColor: '#3f66ac' },
  { id: 'new-sale', title: 'New Sale', icon: ShoppingCart, color: '#ffffff', backgroundColor: '#3f66ac' },
];

export default function FAB({ onAction, onExpandedChange, hiddenActions }: FABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;
  const { isStaff, hasPermission } = usePermissions();
  
  const fabActions = (() => {
    if (!isStaff) return ownerFabActions;
    const actions = [...staffFabActions];
    if (hasPermission('master_access') || hasPermission('staff_management')) {
      actions.splice(1, 0, { id: 'notify-staff', title: 'Notify Staff', icon: Bell, color: '#ffffff', backgroundColor: '#3f66ac' });
    }
    return actions;
  })();
  
  const debouncedNavigate = useDebounceNavigation(500);

  const toggleFAB = () => {
    const willExpand = !isExpanded;
    const toValue = willExpand ? 1 : 0;
    
    if (willExpand) {
      // Start animation first, then render action buttons after 1 frame
      // so animationValue is already >0 when they mount (prevents flash)
      Animated.spring(animationValue, {
        toValue,
        useNativeDriver: Platform.OS !== 'web',
        tension: 120,
        friction: 10,
      }).start();
      requestAnimationFrame(() => setShowActions(true));
    } else {
      Animated.spring(animationValue, {
        toValue,
        useNativeDriver: Platform.OS !== 'web',
        tension: 120,
        friction: 10,
      }).start(() => setShowActions(false));
    }
    
    setIsExpanded(willExpand);
    onExpandedChange?.(willExpand);
  };

  const handleActionPress = (actionId: string) => {
    if (isNavigating) return;
    
    // Check if trial expired before allowing action
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('this action')) {
      toggleFAB();
      return;
    }
    
    onAction?.(actionId);
    setIsNavigating(true);
    
    // Determine route based on action
    let route = '';
    if (actionId === 'new-sale') {
      route = '/new-sale';
    } else if (actionId === 'return') {
      route = '/new-return';
    } else if (actionId === 'payments') {
      route = '/payment-selection';
    } else if (actionId === 'expense') {
      route = '/expenses/income-expense-toggle';
    } else if (actionId === 'notify-staff') {
      route = '/notifications/notify-staff';
    } else if (actionId === 'notify-owner') {
      route = '/notifications/notify-owner';
    } else if (actionId === 'stock') {
      route = '/inventory/stock-management';
    }
    
    if (route) {
      debouncedNavigate(route);
    }
    
    // Reset navigation state after 1 second
    setTimeout(() => setIsNavigating(false), 1000);
    
    toggleFAB();
  };

  return (
    <View style={styles.container}>
      {/* Backdrop Overlay - Blocks all touch events when FAB is expanded */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={toggleFAB}
        />
      )}
      
      {/* Action Buttons - only render when visible to prevent flash */}
      {showActions && fabActions
        .filter(a => !hiddenActions?.includes(a.id))
        .map((action, index, visibleActions) => {
        const IconComponent = action.icon;
        const translateY = animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(45 * (visibleActions.length - index))],
          extrapolate: 'clamp',
        });
        
        const opacity = animationValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });

        const scale = animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={action.id}
            style={[
              styles.actionButton as any,
              {
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.actionRow}>
              {/* Text Button (Left) */}
              <TouchableOpacity
                style={[styles.textButton as any, isNavigating && styles.actionButtonDisabled as any]}
                onPress={() => handleActionPress(action.id)}
                activeOpacity={0.8}
                disabled={isNavigating}
              >
                <Text style={styles.textButtonLabel as any}>{action.title}</Text>
              </TouchableOpacity>
              
              {/* Icon Button (Right) */}
              <TouchableOpacity
                style={[styles.iconButton as any, isNavigating && styles.actionButtonDisabled as any]}
                onPress={() => handleActionPress(action.id)}
                activeOpacity={0.8}
                disabled={isNavigating}
              >
                <IconComponent size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })}

      {/* Main FAB Button - Plus rotates 45° to become X, no icon swap = no flash */}
      <TouchableOpacity
        style={styles.mainButton as any}
        onPress={toggleFAB}
        activeOpacity={0.8}
      >
        <Animated.View style={{
          transform: [{
            rotate: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '45deg'],
              extrapolate: 'clamp',
            }),
          }],
        }}>
          <Plus size={24} color="#ffffff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40, // Above safe area to prevent gesture conflicts
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000, // Higher than backdrop to ensure FAB is clickable
    pointerEvents: 'box-none', // Allow touch events to pass through when not interacting with FAB
    overflow: 'visible', // Ensure proper rendering of animated elements
  },
  backdrop: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: Platform.OS === 'web' ? 0 : -1000,
    left: Platform.OS === 'web' ? 0 : -1000,
    right: Platform.OS === 'web' ? 0 : -1000,
    bottom: Platform.OS === 'web' ? 0 : -1000,
    ...(Platform.OS === 'web' ? { width: '100vw' as any, height: '100vh' as any } : {}),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999, // High z-index to block all interactions
  } as any,
  actionButton: {
    marginBottom: 8,
    zIndex: 1001, // Higher than container to ensure buttons are clickable
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textButton: {
    backgroundColor: '#3f66ac',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  textButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1002, // Highest z-index to ensure main button is always clickable
    overflow: 'hidden', // Prevent any visual artifacts from overflowing
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
});