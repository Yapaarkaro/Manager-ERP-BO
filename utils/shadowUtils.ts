/**
 * Platform-specific shadow utilities
 * Provides consistent shadow styling across iOS, Android, and Web
 * 
 * Usage:
 *   import { getPlatformShadow, getPlatformTextShadow } from '@/utils/shadowUtils';
 *   
 *   const styles = StyleSheet.create({
 *     card: {
 *       ...getPlatformShadow(2),
 *     },
 *     text: {
 *       ...getPlatformTextShadow('rgba(0, 0, 0, 0.1)', 0, 1, 2),
 *     },
 *   });
 */

import { Platform } from 'react-native';

/**
 * Get platform-specific shadow styles
 * @param elevation - Shadow elevation (1-5 recommended)
 * @param color - Shadow color (default: '#000')
 * @param opacity - Shadow opacity (default: 0.1)
 * @returns Platform-specific shadow style object
 */
export const getPlatformShadow = (
  elevation: number = 2,
  color: string = '#000',
  opacity: number = 0.1
) => {
  if (Platform.OS === 'web') {
    // Web: Use boxShadow CSS property
    const blur = elevation * 2;
    const spread = elevation * 0.5;
    return {
      boxShadow: `0 ${elevation}px ${blur}px ${spread}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  } else if (Platform.OS === 'ios') {
    // iOS: Use shadow properties
    return {
      shadowColor: color,
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: opacity,
      shadowRadius: elevation * 2,
    };
  } else {
    // Android: Use elevation
    return {
      elevation,
    };
  }
};

/**
 * Get platform-specific text shadow styles
 * @param color - Text shadow color
 * @param offsetX - Horizontal offset (default: 0)
 * @param offsetY - Vertical offset (default: 1)
 * @param radius - Blur radius (default: 2)
 * @returns Platform-specific text shadow style object
 */
export const getPlatformTextShadow = (
  color: string = 'rgba(0, 0, 0, 0.1)',
  offsetX: number = 0,
  offsetY: number = 1,
  radius: number = 2
) => {
  if (Platform.OS === 'web') {
    // Web: Use textShadow CSS property
    return {
      textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    };
  } else {
    // Native: Use individual textShadow properties
    return {
      textShadowColor: color,
      textShadowOffset: { width: offsetX, height: offsetY },
      textShadowRadius: radius,
    };
  }
};


















