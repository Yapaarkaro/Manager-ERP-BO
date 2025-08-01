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
    backgroundColor: '#10b981',
  },
  {
    id: 'expense',
    title: 'Expense',
    icon: IndianRupee,
    color: '#ffffff',
    backgroundColor: '#ef4444',
  },
  {
    id: 'payments',
    title: 'Payment',
    icon: CreditCard,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
  },
  {
    id: 'stock',
    title: 'Stock',
    icon: Package,
    color: '#ffffff',
    backgroundColor: '#8b5cf6',
  },
  {
    id: 'return',
    title: 'Return',
    icon: RotateCcw,
    color: '#ffffff',
    backgroundColor: '#f59e0b',
  },
  {
    id: 'new-sale',
    title: 'New Sale',
    icon: ShoppingCart,
    color: '#ffffff',
    backgroundColor: '#06b6d4',
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
    
    toggleFAB();
  };

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      {fabActions.map((action, index) => {
        const IconComponent = action.icon;
        const translateY = animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(40 * (fabActions.length - index))],
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
            <TouchableOpacity
              style={styles.actionButtonContainer}
              onPress={() => handleActionPress(action.id)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.actionButtonTouchable,
                { backgroundColor: action.backgroundColor },
              ]}>
                <IconComponent size={20} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.title}</Text>
            </TouchableOpacity>
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
        />
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: -1,
  },
  actionButton: {
    marginBottom: 8,
    zIndex: 1,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonTouchable: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  actionLabel: {
    backgroundColor: '#ffffff',
    color: '#3f66ac',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '500',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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