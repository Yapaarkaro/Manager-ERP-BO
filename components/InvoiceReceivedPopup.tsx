import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { FileText, Eye, Package, X, ShoppingCart } from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#3F66AC',
  success: '#059669',
  successBg: '#ECFDF5',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB' },
};

interface InvoiceReceivedPopupProps {
  visible: boolean;
  invoiceId: string;
  businessId: string;
  invoiceType: string;
  businessName?: string;
  invoiceNumber?: string;
  amount?: number;
  onDismiss: () => void;
  onViewDetails: () => void;
  onAddToPurchases: () => void;
}

export default function InvoiceReceivedPopup({
  visible,
  invoiceType,
  businessName,
  invoiceNumber,
  amount,
  onDismiss,
  onViewDetails,
  onAddToPurchases,
}: InvoiceReceivedPopupProps) {
  if (!visible) return null;

  const typeLabel = invoiceType === 'sale' ? 'Sales' : invoiceType === 'purchase' ? 'Purchase' : 'Return';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={st.overlay}>
        <View style={st.popup}>
          <TouchableOpacity style={st.closeBtn} onPress={onDismiss}>
            <X size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={st.iconWrap}>
            <FileText size={32} color={Colors.primary} />
          </View>

          <Text style={st.title}>Invoice Received</Text>
          <Text style={st.desc}>
            {businessName ? `${businessName} has` : 'A business has'} generated a {typeLabel.toLowerCase()} invoice{invoiceNumber ? ` #${invoiceNumber}` : ''} for you.
          </Text>

          {amount !== undefined && (
            <View style={st.amountCard}>
              <Text style={st.amountLabel}>Invoice Amount</Text>
              <Text style={st.amountValue}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          )}

          <View style={st.actions}>
            <TouchableOpacity style={st.primaryBtn} onPress={onViewDetails} activeOpacity={0.8}>
              <Eye size={18} color="#fff" />
              <Text style={st.primaryBtnText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.secondaryBtn} onPress={onAddToPurchases} activeOpacity={0.8}>
              <ShoppingCart size={18} color={Colors.primary} />
              <Text style={st.secondaryBtnText}>Add to Purchases</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={st.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  popup: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  amountCard: {
    backgroundColor: Colors.successBg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  dismissBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
