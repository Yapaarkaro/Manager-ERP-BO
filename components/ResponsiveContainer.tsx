import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { getWebContainerStyles } from '@/utils/platformUtils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: any;
  fullWidth?: boolean; // Option to disable max-width constraint
}

function ResponsiveContainer({ children, style, fullWidth = false }: ResponsiveContainerProps) {
  const webStyles = getWebContainerStyles();
  const { width } = Dimensions.get('window');
  
  // On web, apply responsive container only if screen is wide enough
  if (Platform.OS === 'web' && !fullWidth && width > 768) {
    return (
      <View style={[webStyles.webContainer, style]}>
        <View style={webStyles.webContentWrapper}>
          {children}
        </View>
      </View>
    );
  }
  
  // On mobile or small screens, just return children
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

export default React.memo(ResponsiveContainer);

