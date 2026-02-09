/**
 * Subscription Hook
 * Provides subscription status and read-only mode checking
 */

import { useState, useEffect } from 'react';
import { subscriptionStore, Subscription } from '@/utils/subscriptionStore';

export interface UseSubscriptionReturn {
  subscription: Subscription;
  isReadOnly: boolean;
  hasActiveSubscription: boolean;
  isTrialExpired: boolean;
  canPerformAction: (action: string) => boolean;
}

/**
 * Hook to check subscription status and read-only mode
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription>(subscriptionStore.getSubscription());

  useEffect(() => {
    // Subscribe to subscription changes
    const unsubscribe = subscriptionStore.addListener(() => {
      setSubscription(subscriptionStore.getSubscription());
    });

    // Initial load
    setSubscription(subscriptionStore.getSubscription());

    return unsubscribe;
  }, []);

  const isReadOnly = subscriptionStore.isReadOnlyMode();
  const hasActiveSubscription = subscriptionStore.hasActiveSubscription();
  const isTrialExpired = subscriptionStore.isTrialExpired();

  const canPerformAction = (action: string): boolean => {
    // In read-only mode, only allow viewing actions
    if (isReadOnly) {
      const viewOnlyActions = ['view', 'read', 'see', 'display', 'show'];
      return viewOnlyActions.some(viewAction => action.toLowerCase().includes(viewAction));
    }
    return true;
  };

  return {
    subscription,
    isReadOnly,
    hasActiveSubscription,
    isTrialExpired,
    canPerformAction,
  };
}

















