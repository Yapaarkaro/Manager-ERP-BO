/**
 * Utility function to generate barcode image as data URI
 * Uses Supabase Edge Function to generate barcode server-side (fixes CORS root cause)
 */

import { callEdgeFunction } from '@/services/backendApi';

export async function generateBarcodeImage(barcodeValue: string): Promise<string | null> {
  if (!barcodeValue || barcodeValue.trim().length === 0) {
    console.warn('⚠️ Barcode value is empty, cannot generate barcode image');
    return null;
  }

  try {
    console.log('📊 Starting barcode generation for:', barcodeValue);
    console.log('🔗 Calling backend Edge Function to generate barcode (fixes CORS)');
    
    // Call Supabase Edge Function to generate barcode server-side
    // This fixes CORS by handling barcode generation on the server
    const result = await callEdgeFunction('generate-barcode', 'POST', { barcode: barcodeValue.trim() }, false);
    
    if (!result.success) {
      console.error('❌ Edge Function error:', result.error);
      return null;
    }
    
    if (result.data?.success && result.data?.barcodeImage) {
      const detectedFormat = result.data?.format || 'Unknown';
      console.log(`✅ Barcode image generated successfully (Format: ${detectedFormat}), length:`, result.data.barcodeImage.length);
      return result.data.barcodeImage;
    } else {
      console.warn('⚠️ Edge Function returned invalid response:', result.data);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error generating barcode image:', error);
    // Return null instead of throwing to allow product creation to continue
    return null;
  }
}

