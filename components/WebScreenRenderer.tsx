/**
 * Web Screen Renderer
 * Renders screens in the main content area (replacing dashboard) for web layout
 * Sidebar remains visible, content area shows selected screen
 */

import React from 'react';
import { View, StyleSheet, Platform, Animated, Text } from 'react-native';
import { useWebNavigation } from '@/contexts/WebNavigationContext';
import { router } from 'expo-router';

interface WebScreenRendererProps {
  sidebarWidth?: number;
}

// Import screen components dynamically
const screenComponents: { [key: string]: React.ComponentType<any> } = {};

// Lazy load screen components
const loadScreenComponent = async (route: string) => {
  if (screenComponents[route]) {
    return screenComponents[route];
  }

  try {
    let Component;
    
    switch (route) {
      case '/all-invoices':
        Component = (await import('@/app/all-invoices')).default;
        break;
      case '/sales':
        Component = (await import('@/app/sales')).default;
        break;
      case '/returns':
        Component = (await import('@/app/returns')).default;
        break;
      case '/inventory':
        Component = (await import('@/app/inventory/index')).default;
        break;
      case '/inventory/product-details':
        Component = (await import('@/app/inventory/product-details')).default;
        break;
      case '/inventory/manual-product':
        Component = (await import('@/app/inventory/manual-product')).default;
        break;
      case '/purchasing/purchases':
        Component = (await import('@/app/purchasing/purchases')).default;
        break;
      case '/purchasing/suppliers':
        Component = (await import('@/app/purchasing/suppliers')).default;
        break;
      case '/people/customers':
        Component = (await import('@/app/people/customers')).default;
        break;
      case '/people/staff':
        Component = (await import('@/app/people/staff')).default;
        break;
      case '/locations/branches':
        Component = (await import('@/app/locations/branches')).default;
        break;
      case '/locations/warehouses':
        Component = (await import('@/app/locations/warehouses')).default;
        break;
      case '/bank-accounts':
        Component = (await import('@/app/bank-accounts')).default;
        break;
      case '/cash-accounts':
        Component = (await import('@/app/cash-accounts')).default;
        break;
      case '/bank-details':
        Component = (await import('@/app/bank-details')).default;
        break;
      case '/marketing':
        Component = (await import('@/app/marketing/index')).default;
        break;
      case '/reports':
        Component = (await import('@/app/reports')).default;
        break;
      case '/settings':
        Component = (await import('@/app/settings')).default;
        break;
      case '/notifications':
        Component = (await import('@/app/notifications')).default;
        break;
      case '/new-sale':
        Component = (await import('@/app/new-sale/index')).default;
        break;
      case '/new-return':
        Component = (await import('@/app/new-return/index')).default;
        break;
      case '/payment-selection':
        Component = (await import('@/app/payment-selection')).default;
        break;
      case '/expenses/income-expense-toggle':
        Component = (await import('@/app/expenses/income-expense-toggle')).default;
        break;
      case '/notifications/notify-staff':
        Component = (await import('@/app/notifications/notify-staff')).default;
        break;
      case '/inventory/stock-management':
        Component = (await import('@/app/inventory/stock-management')).default;
        break;
      case '/privacy-policy':
        Component = (await import('@/app/privacy-policy')).default;
        break;
      case '/terms-and-conditions':
        Component = (await import('@/app/terms-and-conditions')).default;
        break;
      default:
        // For unknown routes, try to navigate normally
        router.push(route as any);
        return null;
    }

    if (Component) {
      screenComponents[route] = Component;
      return Component;
    }
  } catch (error) {
    console.error(`Error loading screen component for ${route}:`, error);
    // Fallback to normal navigation
    router.push(route as any);
  }

  return null;
};

export default function WebScreenRenderer({ sidebarWidth = 280 }: WebScreenRendererProps) {
  const { currentScreen, isWeb } = useWebNavigation();
  const [ScreenComponent, setScreenComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (currentScreen && isWeb) {
      setIsLoading(true);
      // Extract base route (without query params) for component loading
      const baseRoute = currentScreen.split('?')[0];
      
      // Update browser URL to include query params (for useLocalSearchParams to work)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const queryString = currentScreen.includes('?') ? currentScreen.split('?')[1] : '';
        if (queryString) {
          // Update URL without navigating (preserves sidebar)
          const newUrl = `${window.location.pathname}?${queryString}`;
          window.history.replaceState({}, '', newUrl);
          // Trigger a small delay to ensure URL is updated before component renders
          setTimeout(() => {}, 0);
        }
      }
      
      loadScreenComponent(baseRoute).then((Component) => {
        setScreenComponent(() => Component);
        setIsLoading(false);
        
        // Animate fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Animate fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setScreenComponent(null);
      });
    }
  }, [currentScreen, isWeb]);

  if (!isWeb || !currentScreen) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.screenContainer as any,
        {
          opacity: fadeAnim,
          // Adjust for sidebar width - the container already has marginLeft, but we need to ensure
          // the screen content itself is properly positioned
        },
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer as any}>
          <Text style={styles.loadingText as any}>Loading...</Text>
        </View>
      ) : ScreenComponent ? (
        <ScreenComponent />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    ...(Platform.select({
      web: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        zIndex: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto' as any,
      },
      default: {},
    }) || {}),
  } as any,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
      },
    }),
  } as any,
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

