import React, { useState, useRef } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Plus,
  X,
  ShoppingCart,
  RotateCcw,
  Package,
  CreditCard,
  IndianRupee,
  Bell,
  Wallet,
} from 'lucide-react-native';

interface FABProps {
  onAction?: (action: string) => void;
}

interface FABAction {
  id: string;
  title: string;
  icon: any;
  color: string;
  backgroundColor: string;
}

const fabActions: FABAction[] = [
  {
    id: 'notify-staff',
    title: 'Notify Staff',
    icon: Bell,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
  {
    id: 'expense',
    title: 'Income/Expense',
    icon: IndianRupee,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
  {
    id: 'stock',
    title: 'Stock',
    icon: Package,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
  {
    id: 'payments',
    title: 'Payment',
    icon: Wallet,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
  {
    id: 'return',
    title: 'Return',
    icon: RotateCcw,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
  {
    id: 'new-sale',
    title: 'New Sale',
    icon: ShoppingCart,
    color: '#ffffff',
    backgroundColor: '#3f66ac',
  },
];

export default function FAB({ onAction }: FABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  const toggleFAB = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(animationValue, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(rotationValue, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsExpanded(!isExpanded);
  };

  const handleActionPress = (actionId: string) => {
    onAction?.(actionId);
    
    // Navigate to new sale if new-sale action is pressed
    if (actionId === 'new-sale') {
      router.push('/new-sale');
    }
    
    // Navigate to new return if return action is pressed
    if (actionId === 'return') {
      router.push('/new-return');
    }
    
    // Navigate to payment selection if payments action is pressed
    if (actionId === 'payments') {
      router.push('/payment-selection');
    }
    
    // Navigate to income/expense toggle if expense action is pressed
    if (actionId === 'expense') {
      router.push('/expenses/income-expense-toggle');
    }
    
    // Navigate to notify staff if notify-staff action is pressed
    if (actionId === 'notify-staff') {
      router.push('/notifications/notify-staff');
    }
    
    // Navigate to stock management if stock action is pressed
    if (actionId === 'stock') {
      router.replace('/inventory/stock-management');
    }
    
    toggleFAB();
  };

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      {fabActions.map((action, index) => {
        const IconComponent = action.icon;
        const translateY = animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(45 * (fabActions.length - index))],
        });
        
        const opacity = animationValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });

        const scale = animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={action.id}
            style={[
              styles.actionButton,
              {
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.actionRow}>
              {/* Text Button (Left) */}
              <TouchableOpacity
                style={styles.textButton}
                onPress={() => handleActionPress(action.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.textButtonLabel}>{action.title}</Text>
              </TouchableOpacity>
              
              {/* Icon Button (Right) */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleActionPress(action.id)}
                activeOpacity={0.8}
              >
                <IconComponent size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })}

      {/* Main FAB Button */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={toggleFAB}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          {isExpanded ? (
            <X size={24} color="#ffffff" />
          ) : (
            <Plus size={24} color="#ffffff" />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Backdrop */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={toggleFAB}
          activeOpacity={1}
        >
          <View style={styles.glassLayer1} />
          <View style={styles.glassLayer2} />
          <View style={styles.glassLayer3} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: -1,
  },
  glassLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  glassLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionButton: {
    marginBottom: 8,
    zIndex: 1,
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
    zIndex: 2,
  },
});