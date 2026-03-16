import React from 'react';
import { View } from 'react-native';

interface WebBarcodeScannerProps {
  onBarcodeScanned: (result: { type: string; data: string }) => void;
  paused?: boolean;
  style?: any;
}

export default function WebBarcodeScanner(_props: WebBarcodeScannerProps) {
  return <View />;
}
