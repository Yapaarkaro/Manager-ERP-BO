/**
 * Utility function to generate barcode image as data URI
 * Uses Supabase Edge Function to generate barcode server-side (fixes CORS root cause)
 */

import { generateBarcodeImage as generateBarcodeViaApi } from '@/services/backendApi';

export async function generateBarcodeImage(barcodeValue: string): Promise<string | null> {
  if (!barcodeValue || barcodeValue.trim().length === 0) {
    return null;
  }

  try {
    const result = await generateBarcodeViaApi(barcodeValue);
    
    if (!result.success) {
      console.error('Barcode generation failed:', result.error);
      return null;
    }
    
    const data = result.data as any;
    if (data?.success && data?.barcodeImage) {
      return data.barcodeImage;
    }
    return null;
  } catch (error) {
    console.error('Error generating barcode image:', error);
    return null;
  }
}

