import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { getWebContainerStyles } from '@/utils/platformUtils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: any;
  fullWidth?: boolean;
  narrow?: boolean;
  maxWidth?: number;
}

function ResponsiveContainer({ children, style, fullWidth = false, narrow = false, maxWidth }: ResponsiveContainerProps) {
  const webStyles = getWebContainerStyles();
  const { width } = Dimensions.get('window');
  
  if (Platform.OS === 'web' && !fullWidth && width > 768) {
    const effectiveMaxWidth = maxWidth || (narrow ? 520 : 1400);
    return (
      <View style={[webStyles.webContainer, style]}>
        <View style={[webStyles.webContentWrapper, { maxWidth: effectiveMaxWidth }]}>
          {children}
        </View>
      </View>
    );
  }
  
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

export default React.memo(ResponsiveContainer);

