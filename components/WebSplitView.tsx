/**
 * Web Split-View Layout Component
 * Shows screens on the right side instead of navigating to new screens (web-only)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

interface WebSplitViewProps {
  children: React.ReactNode;
  sidebarWidth: number;
}

export default function WebSplitView({ children, sidebarWidth }: WebSplitViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<React.ReactNode>(null);
  const slideAnim = useState(new Animated.Value(0))[0];

  // Only apply split-view on web
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Check if current route should be shown in right panel
  const shouldShowInRightPanel = (route: string) => {
    // Dashboard stays in main area
    if (route === '/dashboard') return false;
    
    // These routes should open in right panel
    const rightPanelRoutes = [
      '/sales',
      '/purchasing',
      '/inventory',
      '/people',
      '/locations',
      '/all-invoices',
      '/returns',
      '/bank-accounts',
      '/reports',
      '/settings',
      '/notifications',
    ];
    
    return rightPanelRoutes.some(panelRoute => route.startsWith(panelRoute));
  };

  useEffect(() => {
    const shouldShow = shouldShowInRightPanel(pathname);
    
    if (shouldShow) {
      setRightPanelVisible(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setRightPanelVisible(false);
      });
    }
  }, [pathname]);

  const rightPanelWidth = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 600], // Right panel width when visible
  });

  return (
    <View style={styles.container}>
      {/* Main content area */}
      <View style={[styles.mainContent, { marginLeft: sidebarWidth }]}>
        {children}
      </View>
      
      {/* Right panel for detail screens */}
      {rightPanelVisible && (
        <Animated.View
          style={[
            styles.rightPanel,
            {
              width: rightPanelWidth,
              opacity: slideAnim,
            },
          ]}
        >
          <View style={styles.rightPanelContent}>
            {/* Content will be rendered by expo-router */}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    ...Platform.select({
      web: {
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  mainContent: {
    flex: 1,
    ...Platform.select({
      web: {
        transition: 'margin-left 0.3s ease',
        minWidth: 0, // Allow shrinking
      },
    }),
  },
  rightPanel: {
    ...Platform.select({
      web: {
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        backgroundColor: '#ffffff',
        borderLeftWidth: 1,
        borderLeftColor: '#e5e7eb',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
        zIndex: 999,
        overflow: 'hidden',
      },
    }),
  },
  rightPanelContent: {
    flex: 1,
    ...Platform.select({
      web: {
        overflow: 'auto',
      },
    }),
  },
});

















