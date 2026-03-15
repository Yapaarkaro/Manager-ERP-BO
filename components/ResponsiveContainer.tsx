import React, { useState, useEffect } from 'react';
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
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = ({ window: w }: { window: { width: number } }) => setWidth(w.width);
    const sub = Dimensions.addEventListener('change', handler);
    return () => sub?.remove();
  }, []);

  if (Platform.OS === 'web' && !fullWidth && width > 768) {
    const effectiveMaxWidth = maxWidth || (narrow ? 680 : 1400);
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

