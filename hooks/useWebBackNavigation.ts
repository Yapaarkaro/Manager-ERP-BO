/**
 * Web Back Navigation Hook
 * Handles back navigation for web (closes screen to show dashboard) and mobile (normal back)
 */

import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useWebNavigation } from '@/contexts/WebNavigationContext';

export function useWebBackNavigation() {
  const { closeScreen, isWeb } = useWebNavigation();

  const handleBack = () => {
    if (isWeb) {
      // On web, close the current screen to show dashboard
      closeScreen();
    } else {
      // On mobile, use normal back navigation
      router.back();
    }
  };

  return { handleBack };
}

















