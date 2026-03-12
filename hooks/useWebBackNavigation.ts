/**
 * Web Back Navigation Hook
 * Uses standard router.back() on all platforms
 */

import { router } from 'expo-router';

export function useWebBackNavigation() {
  const handleBack = () => {
    router.back();
  };

  return { handleBack };
}

















