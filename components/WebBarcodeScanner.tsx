import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface WebBarcodeScannerProps {
  onBarcodeScanned: (result: { type: string; data: string }) => void;
  paused?: boolean;
  style?: any;
}

export default function WebBarcodeScanner({ onBarcodeScanned, paused, style }: WebBarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerId = useRef<string>(`web-barcode-scanner-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  const onScanRef = useRef(onBarcodeScanned);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onBarcodeScanned; }, [onBarcodeScanned]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let scanner: any = null;
    let mounted = true;

    const initScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        if (!mounted) return;

        scanner = new Html5Qrcode(containerId.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
          },
          (decodedText: string, decodedResult: any) => {
            if (pausedRef.current) return;

            const now = Date.now();
            if (decodedText === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) {
              return;
            }
            lastScannedRef.current = decodedText;
            lastScannedTimeRef.current = now;

            const format = decodedResult?.result?.format?.formatName || 'unknown';
            onScanRef.current({ type: format, data: decodedText.trim() });
          },
          () => {}
        );
      } catch (err: any) {
        if (mounted) {
          console.error('Web barcode scanner init error:', err);
          setError(err?.message || 'Failed to start camera');
        }
      }
    };

    const timer = setTimeout(initScanner, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Error: {error}</Text>
          <Text style={styles.errorHint}>Use the manual entry option to type the barcode</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div
        id={containerId.current}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        #${containerId.current} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #${containerId.current} img[alt="Info icon"] { display: none !important; }
        #${containerId.current} > div { border: none !important; }
      ` }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
});
