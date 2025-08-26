import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, X } from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface AnimatedSearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  showFilterButton?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  style?: any;
  /**
   * Safe area edges to respect. Defaults to ['bottom'] for bottom-positioned search bars.
   * Use ['top', 'bottom'] for full-height overlays, or ['left', 'right'] for side panels.
   */
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  /**
   * Additional bottom padding when positioned at bottom. Useful for FABs or other bottom elements.
   */
  bottomPadding?: number;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function AnimatedSearchBar({
  placeholder,
  value,
  onChangeText,
  onFilterPress,
  showFilterButton = true,
  showClearButton = true,
  onClear,
  style,
  safeAreaEdges = ['bottom'],
  bottomPadding = 0
}: AnimatedSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Animation values
  const searchBarPosition = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        console.log('🟢 Keyboard showing, height:', event.endCoordinates.height);
        setKeyboardHeight(event.endCoordinates.height);
        
        // Animate search bar to top, accounting for safe area and bottom padding
        const safeAreaBottom = Platform.OS === 'ios' ? 34 : 16; // iOS home indicator vs Android navigation bar
        const androidAdjustment = Platform.OS === 'android' ? 20 : 0; // Extra adjustment for Android
        const totalBottomSpacing = 140 + safeAreaBottom + bottomPadding + androidAdjustment;
        const targetPosition = -(screenHeight - event.endCoordinates.height - totalBottomSpacing);
        console.log('🎯 Target position:', targetPosition, 'Safe area bottom:', safeAreaBottom, 'Android adjustment:', androidAdjustment, 'Bottom padding:', bottomPadding);
        
        Animated.timing(searchBarPosition, {
          toValue: targetPosition,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        

      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('🔴 Keyboard hiding');
        
        // Animate search bar back to bottom
        Animated.timing(searchBarPosition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        

      }
    );

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, []);

  const handleFocus = () => {
    console.log('🔍 Search bar focused');
    setIsFocused(true);
  };

  const handleBlur = () => {
    console.log('🔍 Search bar blurred');
    setIsFocused(false);
  };

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <>
      {/* Animated Search Bar with Safe Area */}
      <Animated.View
        style={[
          styles.animatedSearchContainer,
          {
            transform: [{ translateY: searchBarPosition }],
          },
          style
        ]}
      >
        <SafeAreaView 
          style={[
            styles.safeAreaContainer, 
            { paddingBottom: 8 + bottomPadding }
          ]} 
          edges={safeAreaEdges}
        >
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
              <Search size={20} color={Colors.textLight} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor={Colors.textLight}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                returnKeyType="search"
                onSubmitEditing={() => {
                  // Keep keyboard open and search bar at top when user hits enter
                  if (value.trim()) {
                    // Search functionality is handled by parent component
                  }
                }}
              />
              {showClearButton && value.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <X size={16} color={Colors.textLight} />
                </TouchableOpacity>
              )}
              {showFilterButton && (
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={onFilterPress}
                  activeOpacity={0.7}
                >
                  <Filter size={20} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Search Results Overlay - Removed to avoid duplication with main screen results */}
    </>
  );
}

const styles = StyleSheet.create({
  animatedSearchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    // Debug: Add border to see the container
    // borderWidth: 2,
    // borderColor: 'red',
  },
  safeAreaContainer: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    minHeight: 56,
  },
  searchBarFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 8,
    padding: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  // Overlay styles removed - search results now displayed on main screen
});
