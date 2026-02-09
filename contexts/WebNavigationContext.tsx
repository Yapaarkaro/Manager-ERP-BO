/**
 * Web Navigation Context
 * Manages split-view navigation for web platform
 * Keeps sidebar visible while showing screens in right panel
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

interface WebNavigationContextType {
  currentScreen: string | null;
  navigateToScreen: (route: string) => void;
  closeScreen: () => void;
  isWeb: boolean;
}

const WebNavigationContext = createContext<WebNavigationContextType | undefined>(undefined);

export function WebNavigationProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  const navigateToScreen = useCallback((route: string) => {
    if (isWeb) {
      // On web, set the screen to show in right panel instead of navigating
      setCurrentScreen(route);
    } else {
      // On mobile, use normal navigation
      router.push(route as any);
    }
  }, [isWeb]);

  const closeScreen = useCallback(() => {
    setCurrentScreen(null);
  }, []);

  return (
    <WebNavigationContext.Provider
      value={{
        currentScreen,
        navigateToScreen,
        closeScreen,
        isWeb,
      }}
    >
      {children}
    </WebNavigationContext.Provider>
  );
}

export function useWebNavigation() {
  const context = useContext(WebNavigationContext);
  if (context === undefined) {
    // Return a safe default instead of throwing (for cases where provider isn't available yet)
    return {
      currentScreen: null,
      navigateToScreen: (route: string) => {
        // Fallback to normal navigation
        router.push(route as any);
      },
      closeScreen: () => {},
      isWeb: false,
    };
  }
  return context;
}

