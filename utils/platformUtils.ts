import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Platform-specific responsive calculations
export const getResponsiveValues = () => {
  const baseHeaderPaddingHorizontal = Math.max(16, screenWidth * 0.04);
  const baseHeaderPaddingVertical = Math.max(12, screenHeight * 0.015);
  const baseBackButtonWidth = Math.max(40, screenWidth * 0.1);
  const baseBackButtonHeight = Math.max(40, screenHeight * 0.05);
  const baseBackButtonMarginRight = Math.max(16, screenWidth * 0.04);
  const baseHeaderTitleFontSize = Math.max(18, screenWidth * 0.045);

  return {
    headerPaddingHorizontal: baseHeaderPaddingHorizontal,
    headerPaddingVertical: baseHeaderPaddingVertical + (Platform.OS === 'android' ? 8 : 0),
    backButtonWidth: baseBackButtonWidth,
    backButtonHeight: baseBackButtonHeight,
    backButtonMarginRight: baseBackButtonMarginRight,
    headerTitleFontSize: baseHeaderTitleFontSize,
    // Additional platform-specific adjustments
    containerPaddingTop: Platform.OS === 'android' ? 4 : 0,
    headerBorderRadius: Platform.OS === 'ios' ? 0 : 0,
    headerElevation: Platform.OS === 'android' ? 2 : 0,
  };
};

// Platform-specific colors and styling
export const getPlatformColors = () => ({
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
});

// Platform-specific header styles
export const getHeaderStyles = () => {
  const values = getResponsiveValues();
  const colors = getPlatformColors();

  return {
    header: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey[200],
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: values.headerPaddingHorizontal,
      paddingVertical: values.headerPaddingVertical,
      paddingTop: values.containerPaddingTop,
      borderRadius: values.headerBorderRadius,
      elevation: values.headerElevation,
      shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
      shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 1 } : undefined,
      shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
      shadowRadius: Platform.OS === 'ios' ? 2 : undefined,
    },
    backButton: {
      width: values.backButtonWidth,
      height: values.backButtonHeight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: values.backButtonMarginRight,
      borderRadius: Platform.OS === 'ios' ? 20 : 4,
      backgroundColor: Platform.OS === 'ios' ? colors.grey[100] : 'transparent',
    },
    headerTitle: {
      fontSize: values.headerTitleFontSize,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
  };
};

// Platform-specific container styles
export const getContainerStyles = () => {
  const colors = getPlatformColors();
  
  return {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
      paddingTop: Platform.OS === 'android' ? 8 : 20,
    },
  };
}; 