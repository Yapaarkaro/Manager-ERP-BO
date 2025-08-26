import { useCallback, useRef } from 'react';
import { router } from 'expo-router';

// Custom hook to prevent multiple rapid taps
export function useDebounceNavigation(delay: number = 500) {
  const lastNavigationTime = useRef(0);
  const isNavigatingRef = useRef(false);
  
  const debouncedNavigate = useCallback((route: any) => {
    const now = Date.now();
    if (now - lastNavigationTime.current > delay && !isNavigatingRef.current) {
      lastNavigationTime.current = now;
      isNavigatingRef.current = true;
      router.push(route);
      // Reset after a delay to allow for navigation completion
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, delay);
    }
  }, [delay]);
  
  return debouncedNavigate;
}

