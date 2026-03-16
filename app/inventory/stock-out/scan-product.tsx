import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';

export default function ScanProductScreen() {
  const { reason } = useLocalSearchParams<{ reason: string }>();

  useEffect(() => {
    safeRouter.replace({
      pathname: '/inventory/scan-product',
      params: { returnTo: 'stock-out', reason },
    });
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
