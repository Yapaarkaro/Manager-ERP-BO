import { Dimensions, Platform, StyleSheet } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Web-specific responsive constants
const WEB_MAX_CONTENT_WIDTH = 1400; // Maximum width for content on web (increased for better desktop experience)
const WEB_CONTENT_PADDING = Platform.OS === 'web' ? 32 : 24; // Horizontal padding for web content
const WEB_SIDEBAR_WIDTH = 0; // Sidebar width (if needed in future)

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
    // Web-specific values
    webMaxContentWidth: WEB_MAX_CONTENT_WIDTH,
    webContentPadding: WEB_CONTENT_PADDING,
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

// Web-responsive container styles
export const getWebContainerStyles = () => {
  const colors = getPlatformColors();
  const values = getResponsiveValues();
  
  return StyleSheet.create({
    webContainer: {
      flex: 1,
      backgroundColor: colors.background,
      ...Platform.select({
        web: {
          alignItems: 'center',
        },
      }),
    },
    webContentWrapper: {
      flex: 1,
      width: '100%',
      ...Platform.select({
        web: {
          maxWidth: values.webMaxContentWidth,
          marginHorizontal: 'auto',
          paddingHorizontal: values.webContentPadding,
        },
      }),
    },
    webScrollContent: {
      ...Platform.select({
        web: {
          paddingHorizontal: values.webContentPadding,
        },
        default: {
          paddingHorizontal: 16,
        },
      }),
    },
  });
};

// Consistent input focus styles across all platforms
export const getInputFocusStyles = () => {
  const colors = getPlatformColors();
  
  return StyleSheet.create({
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.grey[200],
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
      ...Platform.select({
        web: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        },
        default: {
          // Ensure inputs are selectable on mobile
          pointerEvents: 'box-none', // Allow touches to pass through to children
          backgroundColor: 'transparent', // Ensure no background blocking
        },
      }),
    },
    inputContainerFocused: {
      borderColor: colors.primary,
      ...Platform.select({
        web: {
          // Use rgba for proper opacity on web
          boxShadow: '0 0 0 3px rgba(63, 102, 172, 0.12)', // primary color with 12% opacity
          outline: 'none',
        },
        default: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        },
      }),
    },
    input: {
      flex: 1,
      paddingVertical: Platform.select({
        web: 14,
        default: 14, // Keep consistent padding
      }),
      fontSize: 16,
      color: colors.text,
      borderWidth: 0,
      ...Platform.select({
        web: {
          outlineWidth: 0,
          outlineColor: 'transparent',
          outlineStyle: 'none',
        },
        default: {
          // Ensure inputs are fully interactive on mobile
          minHeight: 50, // Better touch target
          backgroundColor: 'transparent', // Ensure no background blocking
          pointerEvents: 'auto', // Explicitly allow touches
        },
      }),
    },
  });
}; 