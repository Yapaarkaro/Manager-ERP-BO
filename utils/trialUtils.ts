/**
 * Trial Utilities
 * Helper functions for trial expiration checks and alerts
 */

import { Alert } from 'react-native';
import { subscriptionStore } from './subscriptionStore';

/**
 * Check if trial has expired and show alert if needed
 * @returns true if trial expired, false otherwise
 */
export function checkTrialExpiration(): boolean {
  const subscription = subscriptionStore.getSubscription();
  
  if (!subscription.isOnTrial || !subscription.trialEndDate) {
    return false; // Not on trial or no end date
  }

  const trialEndDate = new Date(subscription.trialEndDate);
  const now = new Date();
  
  if (now >= trialEndDate) {
    // Trial has expired
    const formattedDate = trialEndDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    Alert.alert(
      'Free Trial Expired',
      `Your free trial has expired on ${formattedDate}. Please subscribe to continue using this feature.`,
      [
        {
          text: 'View Plans',
          onPress: () => {
            // Navigate to subscription page
            const { router } = require('expo-router');
            router.push('/subscription');
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
    
    return true;
  }
  
  return false;
}

/**
 * Check if user can perform action (not in read-only mode)
 * @param actionName - Name of the action (for logging)
 * @returns true if action is allowed, false if trial expired
 */
export function canPerformAction(actionName: string = 'this action'): boolean {
  if (subscriptionStore.isReadOnlyMode()) {
    const subscription = subscriptionStore.getSubscription();
    const trialEndDate = subscription.trialEndDate 
      ? new Date(subscription.trialEndDate)
      : null;
    
    const formattedDate = trialEndDate 
      ? trialEndDate.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'the expiry date';
    
    Alert.alert(
      'Free Trial Expired',
      `Your free trial has expired on ${formattedDate}. Please subscribe to continue using this feature.`,
      [
        {
          text: 'View Plans',
          onPress: () => {
            const { router } = require('expo-router');
            router.push('/subscription');
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
    
    return false;
  }
  
  return true;
}

















