import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { generateInvoiceLinkURL, InvoiceQRData } from './invoiceQRGenerator';
import { downloadInvoiceOnWeb } from './invoicePdfGenerator';
import type { InvoicePDFData } from './invoicePdfGenerator';
import { getOrCreateConversation, sendMessage } from '@/services/backendApi';

export async function shareInvoicePDF(fileUri: string, invoiceNumber: string): Promise<void> {
  if (Platform.OS === 'web') {
    // On web, the PDF was already handled (printed/downloaded via browser)
    if (fileUri === 'web-handled') return;
    Alert.alert('Download', "The invoice has been opened for download. Use your browser's Save as PDF option.");
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Sharing Unavailable', 'Sharing is not available on this device');
    return;
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error: any) {
    if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
    console.error('Share failed:', error);
    Alert.alert('Share Failed', 'Could not share the invoice. Please try again.');
  }
}

export async function shareInvoiceLink(qrData: InvoiceQRData): Promise<void> {
  const linkUrl = generateInvoiceLinkURL(qrData);

  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(linkUrl);
      Alert.alert('Link Copied', 'Invoice link has been copied to clipboard');
    } catch {
      Alert.alert('Invoice Link', linkUrl);
    }
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Invoice Link', linkUrl);
    return;
  }

  // On native, we need to share text. expo-sharing requires a file URI,
  // so we use Clipboard + alert as fallback for link sharing.
  try {
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(linkUrl);
    Alert.alert('Link Copied', 'Invoice link has been copied to clipboard. You can share it via any app.');
  } catch {
    Alert.alert('Invoice Link', linkUrl);
  }
}

export interface ShareToChatParams {
  businessId: string;
  contactId: string;
  contactType: 'staff' | 'customer' | 'supplier' | 'owner';
  contactName: string;
  invoiceNumber: string;
  invoiceType: 'sale' | 'purchase' | 'return';
  totalAmount: number;
  invoiceId?: string;
}

export async function shareToChat(params: ShareToChatParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');

    const convResult = await getOrCreateConversation({
      businessId: params.businessId,
      otherPartyId: params.contactId,
      otherPartyType: params.contactType as 'staff' | 'customer' | 'supplier',
      otherPartyName: params.contactName,
    });

    if (!convResult.success || !convResult.conversation) {
      return { success: false, error: convResult.error || 'Could not create conversation' };
    }

    const typeLabel = params.invoiceType === 'sale' ? 'Sales Invoice' : params.invoiceType === 'purchase' ? 'Purchase Invoice' : 'Return/Credit Note';
    const message = `📄 ${typeLabel} #${params.invoiceNumber}\nAmount: ₹${params.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nThis invoice has been shared with you from Manager.`;

    const { data: { session } } = await supabase.auth.getSession();
    const sType = convResult.crossBusiness ? 'supplier' : 'owner';

    const sendResult = await sendMessage({
      conversationId: convResult.conversation.id,
      senderId: session?.user?.id || params.businessId,
      senderType: sType as any,
      senderName: 'Business',
      content: message,
      messageType: 'text',
    });

    if (!sendResult.success) {
      return { success: false, error: sendResult.error || 'Failed to send message' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to share in chat' };
  }
}

export function openWhatsApp(phoneNumber: string, message: string): void {
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');
  const withCountryCode = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${withCountryCode}?text=${encoded}`;
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    const { Linking: RNLinking } = require('react-native');
    RNLinking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.');
    });
  }
}

export async function autoSendDocumentToChat(params: {
  businessId: string;
  contactId: string;
  contactType: 'supplier' | 'customer';
  contactName: string;
  documentType: 'return_invoice' | 'discrepancy_report' | 'purchase_order';
  documentNumber: string;
  totalAmount: number;
  entityId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');

    const convResult = await getOrCreateConversation({
      businessId: params.businessId,
      otherPartyId: params.contactId,
      otherPartyType: params.contactType,
      otherPartyName: params.contactName,
    });

    if (!convResult.success || !convResult.conversation) {
      return { success: false, error: convResult.error || 'Could not create conversation' };
    }

    const typeLabels: Record<string, string> = {
      return_invoice: 'Return Invoice',
      discrepancy_report: 'Stock Discrepancy Report',
      purchase_order: 'Purchase Order',
    };
    const label = typeLabels[params.documentType] || params.documentType;
    const message = `📄 ${label} #${params.documentNumber}\nAmount: ₹${params.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nThis document has been shared with you from Manager.`;

    const { data: { session } } = await supabase.auth.getSession();
    const sType = convResult.crossBusiness ? 'supplier' : 'owner';

    const sendResult = await sendMessage({
      conversationId: convResult.conversation.id,
      senderId: session?.user?.id || params.businessId,
      senderType: sType as any,
      senderName: 'Business',
      content: message,
      messageType: 'file',
      metadata: {
        document_type: params.documentType,
        entity_id: params.entityId || '',
        entity_number: params.documentNumber,
      },
    });

    if (!sendResult.success) {
      return { success: false, error: sendResult.error || 'Failed to send message' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to share in chat' };
  }
}

export function showShareOptions(params: {
  fileUri?: string;
  invoiceNumber: string;
  invoiceId?: string;
  businessId?: string;
  invoiceType: 'sale' | 'purchase' | 'return';
  onShareToChat?: () => void;
  onShareViaWhatsApp?: () => void;
  invoicePdfData?: InvoicePDFData;
}): void {
  const options: { text: string; onPress: () => void }[] = [];

  if (params.fileUri) {
    options.push({
      text: 'Share PDF',
      onPress: () => shareInvoicePDF(params.fileUri!, params.invoiceNumber),
    });
  }

  // On web without fileUri, offer Download/Print via browser print dialog
  if (Platform.OS === 'web' && !params.fileUri && params.invoicePdfData) {
    options.push({
      text: 'Download/Print',
      onPress: () => downloadInvoiceOnWeb(params.invoicePdfData!),
    });
  }

  if (params.invoiceId && params.businessId) {
    options.push({
      text: 'Copy Invoice Link',
      onPress: () => shareInvoiceLink({
        invoiceId: params.invoiceId!,
        businessId: params.businessId!,
        type: params.invoiceType,
      }),
    });
  }

  if (params.onShareToChat) {
    options.push({
      text: 'Share in Chat',
      onPress: params.onShareToChat,
    });
  }

  if (params.onShareViaWhatsApp) {
    options.push({
      text: 'Share via WhatsApp',
      onPress: params.onShareViaWhatsApp,
    });
  }

  options.push({ text: 'Cancel', onPress: () => {} });

  Alert.alert('Share Invoice', 'Choose how to share this invoice:', options.map(o => ({
    text: o.text,
    onPress: o.onPress,
    style: o.text === 'Cancel' ? 'cancel' as const : 'default' as const,
  })));
}
