import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking as RNLinking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Paperclip,
  Mic,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  Search,
  X,
  FileText,
  ShoppingCart,
  RotateCcw,
  ClipboardList,
  Plus,
  Bell,
  Camera,
  Video,
  Trash2,
  CircleCheck,
} from 'lucide-react-native';
import { usePermissions } from '@/contexts/PermissionContext';
import { sendMessage, getMessages, markMessagesRead, getInvoices, getReturns, getPurchaseOrders, getPurchaseInvoices, getPayables, getReceivables, getInvoiceWithItems, getReturnById } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';
import { useBusinessData } from '@/hooks/useBusinessData';
import { getInitials, formatCurrencyINR } from '@/utils/formatters';
import { generateInvoiceHTML } from '@/utils/invoicePdfGenerator';
import { WebView } from 'react-native-webview';
import { consumeNavData } from '@/utils/navStore';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  error: '#DC2626',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  },
};

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'owner' | 'staff' | 'customer' | 'supplier';
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'file';
  media_url: string | null;
  metadata: {
    document_type?: string;
    entity_id?: string;
    entity_number?: string;
  } | null;
  is_read: boolean;
  created_at: string;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    name: string;
    type: 'staff' | 'customer' | 'supplier' | 'owner';
    otherPartyId: string;
    crossBusiness: string;
  }>();
  const chatMeta = consumeNavData<{name: string; type: string; crossBusiness?: boolean}>('chatMeta');
  const conversationId = params.conversationId;
  const routeName = chatMeta?.name || params.name || '';
  const type = (chatMeta?.type || params.type) as 'staff' | 'customer' | 'supplier' | 'owner';
  const otherPartyId = params.otherPartyId;
  const isCrossBusiness = chatMeta?.crossBusiness || params.crossBusiness === 'true';
  const { isStaff, isOwner, staffId, staffName } = usePermissions();
  const { data: bizData } = useBusinessData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docPickerLoading, setDocPickerLoading] = useState(false);
  const [docPickerCategory, setDocPickerCategory] = useState<string | null>(null);
  const [docPickerItems, setDocPickerItems] = useState<any[]>([]);
  const [isBusinessParty, setIsBusinessParty] = useState(false);
  const [localPartyId, setLocalPartyId] = useState<string | null>(null);

  // Document viewer state
  const [docViewerHtml, setDocViewerHtml] = useState<string | null>(null);
  const [docViewerTitle, setDocViewerTitle] = useState('');
  const [docViewerLoading, setDocViewerLoading] = useState(false);

  // Attachment menu & selection
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const isSelecting = selectedMessages.size > 0;

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingLoaded, setRecordingLoaded] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const senderType: 'owner' | 'staff' | 'supplier' = isCrossBusiness ? 'supplier' : (isStaff ? 'staff' : 'owner');
  const senderId = isStaff ? (staffId || '') : (userId || '');
  const senderName = isStaff ? (staffName || 'Staff') : (bizData?.business?.owner_name || bizData?.business?.legal_name || 'Owner');

  const name = resolvedName || routeName;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const genericNames = ['staff', 'Staff', 'owner', 'Owner', 'customer', 'Customer', 'supplier', 'Supplier', 'Unknown', 'unknown', '', 'Business', 'Business Partner', 'Partner'];
    const needsDbLookup = isStaff || type === 'owner' || type === 'staff';
    if (!needsDbLookup && routeName && !genericNames.includes(routeName)) {
      setResolvedName(routeName);
      return;
    }
    (async () => {
      const { data: convo } = await supabase
        .from('conversations')
        .select('participant_other_id, participant_other_type, participant_other_name, participant_owner_id, business_id')
        .eq('id', conversationId)
        .single();
      if (!convo) return;

      if (isCrossBusiness) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('legal_name, owner_name')
          .eq('id', convo.business_id)
          .maybeSingle();
        setResolvedName(biz?.legal_name || biz?.owner_name || 'Business Partner');
      } else if (isStaff && (convo.participant_other_type === 'staff' || type === 'owner')) {
        const { data: ownerRow } = await supabase
          .from('users')
          .select('name')
          .eq('id', convo.participant_owner_id)
          .maybeSingle();
        setResolvedName(ownerRow?.name || 'Business Owner');
      } else if (convo.participant_other_type === 'staff') {
        if (isStaff && staffId && convo.participant_other_id === staffId) {
          const { data: ownerRow } = await supabase.from('users').select('name').eq('id', convo.participant_owner_id).maybeSingle();
          setResolvedName(ownerRow?.name || 'Business Owner');
        } else {
          const { data: staffRow } = await supabase.from('staff').select('name').eq('id', convo.participant_other_id).maybeSingle();
          const otherStaffName = staffRow?.name ?? null;
          if (otherStaffName) {
            setResolvedName(otherStaffName);
            if (otherStaffName !== convo.participant_other_name) {
              supabase.from('conversations').update({ participant_other_name: otherStaffName }).eq('id', conversationId).then(() => {});
            }
          } else {
            setResolvedName(convo.participant_other_name && convo.participant_other_name !== 'Staff' ? convo.participant_other_name : 'Staff Member');
          }
        }
      } else if (convo.participant_other_type === 'supplier') {
        const { data: supplierRow } = await supabase
          .from('suppliers')
          .select('business_name, contact_person')
          .eq('id', convo.participant_other_id)
          .maybeSingle();
        const supplierName = supplierRow?.business_name || supplierRow?.contact_person;
        if (supplierName) {
          setResolvedName(supplierName);
          if (supplierName !== convo.participant_other_name) {
            supabase.from('conversations').update({ participant_other_name: supplierName }).eq('id', conversationId).then(() => {});
          }
        } else {
          setResolvedName(convo.participant_other_name || 'Supplier');
        }
      } else if (convo.participant_other_type === 'customer') {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('name, business_name')
          .eq('id', convo.participant_other_id)
          .maybeSingle();
        const customerName = customerRow?.business_name || customerRow?.name;
        if (customerName) {
          setResolvedName(customerName);
          if (customerName !== convo.participant_other_name) {
            supabase.from('conversations').update({ participant_other_name: customerName }).eq('id', conversationId).then(() => {});
          }
        } else {
          setResolvedName(convo.participant_other_name || 'Customer');
        }
      } else {
        setResolvedName(convo.participant_other_name || routeName || 'Chat');
      }
    })();
  }, [conversationId, routeName, isStaff, staffId, isCrossBusiness, type]);

  // Load messages on mount
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const result = await getMessages(conversationId, 200);
      if (!cancelled && result.success && result.messages) {
        setMessages(result.messages);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [conversationId]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId) return;
    markMessagesRead(conversationId, senderType);
  }, [conversationId, senderType]);

  // Subscribe to Realtime inserts
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel('chat-' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if ((newMsg as any).is_deleted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          markMessagesRead(conversationId, senderType);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, senderType]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (sound) await sound.unloadAsync();
          if (recording && recordingLoaded) await recording.stopAndUnloadAsync();
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        } catch {}
      };
      cleanup();
    };
  }, [sound, recording, recordingLoaded]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending || !conversationId) return;

    setSending(true);
    setInputText('');

    const result = await sendMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      content: text,
      messageType: 'text',
    });

    if (!result.success) {
      setInputText(text);
      Alert.alert('Message Failed', result.error || 'Could not send message. Please try again.');
    }

    setSending(false);
  }, [inputText, sending, conversationId, senderId, senderType, senderName]);

  const handlePickImage = useCallback(async () => {
    if (!conversationId) return;

    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'jpg';
    const fileName = `${conversationId}/${Date.now()}.${ext}`;

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuf = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, arrayBuf, {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      await sendMessage({
        conversationId,
        senderId,
        senderType,
        senderName,
        content: '📷 Photo',
        messageType: 'image',
        mediaUrl: urlData.publicUrl,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send image.');
    }
  }, [conversationId, senderId, senderType, senderName]);

  const handleTakePhoto = useCallback(async () => {
    if (!conversationId) return;
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'jpg';
    const fileName = `${conversationId}/${Date.now()}.${ext}`;
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuf = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, arrayBuf, { contentType: asset.mimeType || 'image/jpeg', upsert: false });
      if (uploadError) { Alert.alert('Upload Failed', uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await sendMessage({ conversationId, senderId, senderType, senderName, content: '📷 Photo', messageType: 'image', mediaUrl: urlData.publicUrl });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send photo.');
    }
  }, [conversationId, senderId, senderType, senderName]);

  const handlePickVideo = useCallback(async () => {
    if (!conversationId) return;
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.5,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'mp4';
    const fileName = `${conversationId}/video_${Date.now()}.${ext}`;
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuf = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, arrayBuf, { contentType: asset.mimeType || 'video/mp4', upsert: false });
      if (uploadError) { Alert.alert('Upload Failed', uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await sendMessage({ conversationId, senderId, senderType, senderName, content: '🎬 Video', messageType: 'image', mediaUrl: urlData.publicUrl });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send video.');
    }
  }, [conversationId, senderId, senderType, senderName]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMessages.size === 0) return;
    Alert.alert(
      'Delete Messages',
      `Delete ${selectedMessages.size} message${selectedMessages.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const ids = Array.from(selectedMessages);
            await supabase.from('messages').update({ is_deleted: true }).in('id', ids);
            setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
            setSelectedMessages(new Set());
          },
        },
      ],
    );
  }, [selectedMessages]);

  const toggleSelectMessage = useCallback((msgId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingLoaded(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Failed to start recording.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording || !conversationId) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      setRecording(null);
      setRecordingLoaded(false);

      if (uri) {
        const ext = 'mp4';
        const fileName = `${conversationId}/audio_${Date.now()}.${ext}`;

        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuf = await new Response(blob).arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, arrayBuf, {
            contentType: 'audio/mp4',
            upsert: false,
          });

        if (uploadError) {
          Alert.alert('Upload Failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);

        await sendMessage({
          conversationId,
          senderId,
          senderType,
          senderName,
          content: '🎤 Voice message',
          messageType: 'audio',
          mediaUrl: urlData.publicUrl,
        });
      }

      setRecordingDuration(0);
    } catch {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  }, [recording, conversationId, senderId, senderType, senderName]);

  const playAudio = useCallback(async (uri: string, messageId: string) => {
    try {
      if (sound) await sound.unloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: s } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0, progressUpdateIntervalMillis: 200 },
      );

      setSound(s);
      setPlayingMessageId(messageId);
      setAudioProgress(0);

      s.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setPlayingMessageId(null);
            setAudioProgress(0);
          } else if (status.positionMillis && status.durationMillis) {
            setAudioProgress((status.positionMillis / status.durationMillis) * 100);
          }
        }
      });
    } catch {
      setPlayingMessageId(null);
      setAudioProgress(0);
    }
  }, [sound]);

  const stopAudio = useCallback(async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setPlayingMessageId(null);
    } catch {}
  }, [sound]);

  // Check if the other party is a business (for document sharing)
  useEffect(() => {
    if (!conversationId) return;
    if (isCrossBusiness) {
      setIsBusinessParty(true);
      return;
    }
    (async () => {
      const { data: convo } = await supabase
        .from('conversations')
        .select('participant_other_type, participant_other_user_id, participant_other_id')
        .eq('id', conversationId)
        .single();
      if (!convo) return;
      if (convo.participant_other_type === 'supplier') {
        const { data: sup } = await supabase
          .from('suppliers')
          .select('linked_user_id')
          .eq('id', convo.participant_other_id)
          .maybeSingle();
        setIsBusinessParty(!!(sup?.linked_user_id || convo.participant_other_user_id));
      } else if (convo.participant_other_type === 'customer') {
        setIsBusinessParty(!!convo.participant_other_user_id);
      } else {
        setIsBusinessParty(false);
      }
    })();
  }, [conversationId, isCrossBusiness]);

  // Resolve local party ID for doc filtering (cross-business needs remapping)
  useEffect(() => {
    if (otherPartyId && !isCrossBusiness) {
      setLocalPartyId(otherPartyId);
      return;
    }
    if (!conversationId || !isCrossBusiness) return;
    (async () => {
      try {
        const { data: convo } = await supabase
          .from('conversations')
          .select('business_id, participant_other_id, participant_other_type')
          .eq('id', conversationId)
          .single();
        if (!convo) return;
        const { data: otherBiz } = await supabase
          .from('businesses')
          .select('phone, legal_name')
          .eq('id', convo.business_id)
          .maybeSingle();
        if (!otherBiz?.phone) return;
        const normalizedPhone = (otherBiz.phone || '').replace(/^\+91/, '').replace(/\D/g, '');
        const myBizId = bizData?.business?.id;
        if (!myBizId) return;

        if (type === 'customer') {
          const { data: customers } = await supabase
            .from('customers')
            .select('id, mobile, name')
            .eq('business_id', myBizId);
          const match = (customers || []).find((c: any) => {
            const cPhone = (c.mobile || '').replace(/^\+91/, '').replace(/\D/g, '');
            return cPhone === normalizedPhone;
          });
          if (match) setLocalPartyId(match.id);
        } else if (type === 'supplier') {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, mobile_number, name')
            .eq('business_id', myBizId);
          const match = (suppliers || []).find((s: any) => {
            const sPhone = (s.mobile_number || '').replace(/^\+91/, '').replace(/\D/g, '');
            return sPhone === normalizedPhone;
          });
          if (match) setLocalPartyId(match.id);
        }
      } catch {}
    })();
  }, [conversationId, isCrossBusiness, otherPartyId, type, bizData?.business?.id]);

  const loadDocPickerCategory = useCallback(async (category: string) => {
    setDocPickerCategory(category);
    setDocPickerLoading(true);
    setDocPickerItems([]);
    const pid = localPartyId || otherPartyId;
    try {
      if (category === 'sales_invoices') {
        const res = await getInvoices();
        const filtered = (res.invoices || [])
          .filter((inv: any) => inv.customer_id === pid || inv.customerId === pid)
          .slice(0, 20);
        setDocPickerItems(filtered.map((inv: any) => ({
          id: inv.id,
          number: inv.invoice_number || inv.invoiceNumber,
          date: inv.created_at || inv.date,
          amount: inv.total_amount || inv.totalAmount || inv.total || 0,
          type: 'sales_invoice',
          label: `Invoice ${inv.invoice_number || inv.invoiceNumber}`,
        })));
      } else if (category === 'purchase_orders') {
        const res = await getPurchaseOrders();
        const filtered = (res.orders || [])
          .filter((po: any) => po.supplier_id === pid || po.supplierId === pid)
          .slice(0, 20);
        setDocPickerItems(filtered.map((po: any) => ({
          id: po.id,
          number: po.po_number || po.poNumber,
          date: po.created_at || po.date,
          amount: po.total_amount || po.totalAmount || po.grandTotal || 0,
          type: 'purchase_order',
          label: `PO ${po.po_number || po.poNumber}`,
        })));
      } else if (category === 'purchase_invoices') {
        const res = await getPurchaseInvoices();
        const filtered = (res.invoices || [])
          .filter((inv: any) => inv.supplier_id === pid || inv.supplierId === pid)
          .slice(0, 20);
        setDocPickerItems(filtered.map((inv: any) => ({
          id: inv.id,
          number: inv.invoice_number || inv.invoiceNumber,
          date: inv.created_at || inv.date,
          amount: inv.total_amount || inv.totalAmount || inv.total || 0,
          type: 'purchase_invoice',
          label: `Purchase Inv ${inv.invoice_number || inv.invoiceNumber}`,
        })));
      } else if (category === 'returns') {
        const res = await getReturns();
        const filtered = (res.returns || [])
          .filter((r: any) => r.customer_id === pid || r.customerId === pid ||
                              r.supplier_id === pid || r.supplierId === pid)
          .slice(0, 20);
        setDocPickerItems(filtered.map((r: any) => ({
          id: r.id,
          number: r.return_number || r.returnNumber,
          date: r.created_at || r.date,
          amount: r.total_amount || r.totalAmount || 0,
          type: 'return',
          label: `Return ${r.return_number || r.returnNumber}`,
        })));
      } else if (category === 'payment_reminders') {
        if (type === 'supplier') {
          const res = await getPayables();
          const filtered = (res.payables || [])
            .filter((p: any) => p.supplierId === pid || p.id === pid)
            .slice(0, 20);
          setDocPickerItems(filtered.map((p: any) => ({
            id: p.id || p.supplierId,
            number: `Payable - ${p.supplierName || name}`,
            date: p.oldestBillDate || new Date().toISOString(),
            amount: p.totalPayable || 0,
            type: 'payable_reminder',
            label: `Payable: ${formatCurrencyINR(p.totalPayable || 0)} (${p.billCount || 0} bills)`,
          })));
        } else if (type === 'customer') {
          const res = await getReceivables();
          const filtered = (res.receivables || [])
            .filter((r: any) => r.customerId === pid || r.id === pid)
            .slice(0, 20);
          setDocPickerItems(filtered.map((r: any) => ({
            id: r.id || r.customerId,
            number: `Receivable - ${r.customerName || name}`,
            date: r.oldestInvoiceDate || new Date().toISOString(),
            amount: r.totalReceivable || 0,
            type: 'receivable_reminder',
            label: `Receivable: ${formatCurrencyINR(r.totalReceivable || 0)} (${r.invoiceCount || 0} invoices)`,
          })));
        }
      }
    } catch {}
    setDocPickerLoading(false);
  }, [localPartyId, otherPartyId, type, name]);

  const handleSendDocument = useCallback(async (doc: any) => {
    if (!conversationId) return;

    const typeLabels: Record<string, string> = {
      sales_invoice: 'Sales Invoice',
      purchase_order: 'Purchase Order',
      purchase_invoice: 'Purchase Invoice',
      return: 'Return Invoice',
      payable_reminder: 'Payment Reminder',
      receivable_reminder: 'Payment Reminder',
    };

    const isReminder = doc.type === 'payable_reminder' || doc.type === 'receivable_reminder';
    const content = isReminder
      ? `🔔 ${doc.type === 'receivable_reminder' ? 'Payment Reminder' : 'Payment Update'}: ${doc.number}\nOutstanding: ${formatCurrencyINR(doc.amount || 0)}`
      : `📄 ${typeLabels[doc.type] || 'Document'}: ${doc.number}\nAmount: ${formatCurrencyINR(doc.amount || 0)}`;

    await sendMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      content,
      messageType: 'file',
      metadata: {
        document_type: doc.type,
        entity_id: doc.id,
        entity_number: doc.number,
      },
    });

    setShowDocPicker(false);
    setDocPickerCategory(null);
    setDocPickerItems([]);
  }, [conversationId, senderId, senderType, senderName]);

  const handleOpenDocument = useCallback(async (msg: Message) => {
    const docType = msg.metadata?.document_type;
    const entityId = msg.metadata?.entity_id;
    if (!docType || !entityId) {
      if (msg.media_url) RNLinking.openURL(msg.media_url);
      return;
    }
    if (docType === 'payable_reminder' || docType === 'receivable_reminder') return;

    setDocViewerLoading(true);
    setDocViewerTitle(msg.metadata?.entity_number || 'Document');
    try {
      const biz = bizData?.business;
      const businessInfo = {
        name: biz?.legal_name || biz?.owner_name || '',
        address: [biz?.address_line1, biz?.address_line2, biz?.city, biz?.state, biz?.pincode].filter(Boolean).join(', '),
        gstin: biz?.gstin || '',
        phone: biz?.phone || '',
        email: biz?.email || '',
      };

      let html = '';

      if (docType === 'sales_invoice') {
        const res = await getInvoiceWithItems(entityId);
        if (!res.success || !res.invoice) throw new Error('Invoice not found');
        const inv = res.invoice;
        const items = (res.items || []).map((it: any) => ({
          name: it.product_name || it.name || '',
          hsnCode: it.hsn_code || '',
          quantity: Number(it.quantity) || 0,
          unit: it.unit || 'pcs',
          rate: Number(it.unit_price || it.rate) || 0,
          discount: Number(it.discount) || 0,
          taxRate: Number(it.tax_rate || it.gst_rate) || 0,
          taxAmount: Number(it.tax_amount || it.gst_amount) || 0,
          cessAmount: Number(it.cess_amount) || 0,
          total: Number(it.total || it.amount) || 0,
        }));
        html = generateInvoiceHTML({
          type: 'sale',
          invoiceNumber: inv.invoice_number || '',
          invoiceDate: inv.invoice_date || inv.created_at || '',
          dueDate: inv.due_date,
          business: businessInfo,
          customer: { name: inv.customer_name || inv.supplier_name || '', gstin: inv.customer_gstin || '' },
          supplierName: inv.supplier_name,
          items,
          subtotal: Number(inv.subtotal) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          cessAmount: Number(inv.cess_amount) || 0,
          discount: Number(inv.discount) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          paidAmount: Number(inv.paid_amount) || 0,
          balanceDue: Number(inv.balance_amount) || 0,
          paymentMethod: inv.payment_method,
          paymentStatus: inv.payment_status,
        });
      } else if (docType === 'purchase_invoice') {
        const { data: pInv } = await supabase
          .from('purchase_invoices')
          .select('*')
          .eq('id', entityId)
          .maybeSingle();
        if (!pInv) throw new Error('Purchase invoice not found');
        const { data: pItems } = await supabase
          .from('purchase_invoice_items')
          .select('*')
          .eq('purchase_invoice_id', entityId)
          .eq('is_deleted', false);
        const items = (pItems || []).map((it: any) => ({
          name: it.product_name || it.name || '',
          hsnCode: it.hsn_code || '',
          quantity: Number(it.quantity) || 0,
          unit: it.primary_unit || it.unit || 'pcs',
          rate: Number(it.unit_price) || 0,
          discount: 0,
          taxRate: Number(it.tax_rate) || 0,
          taxAmount: Number(it.tax_amount) || 0,
          cessAmount: Number(it.cess_amount) || 0,
          total: Number(it.total_price || it.total) || 0,
        }));
        html = generateInvoiceHTML({
          type: 'purchase',
          invoiceNumber: pInv.invoice_number || '',
          invoiceDate: pInv.invoice_date || pInv.created_at || '',
          dueDate: pInv.due_date,
          business: businessInfo,
          supplierName: pInv.supplier_name || '',
          items,
          subtotal: Number(pInv.subtotal) || 0,
          taxAmount: Number(pInv.tax_amount) || 0,
          totalAmount: Number(pInv.total_amount) || 0,
          paidAmount: Number(pInv.paid_amount) || 0,
          balanceDue: Number(pInv.balance_amount) || 0,
          paymentStatus: pInv.payment_status,
        });
      } else if (docType === 'return') {
        const res = await getReturnById(entityId);
        if (!res.success || !res.returnData) throw new Error('Return not found');
        const ret = res.returnData;
        const items = (res.items || []).map((it: any) => ({
          name: it.product_name || it.name || '',
          hsnCode: it.hsn_code || '',
          quantity: Number(it.quantity) || 0,
          unit: it.unit || 'pcs',
          rate: Number(it.unit_price || it.rate) || 0,
          discount: 0,
          taxRate: Number(it.tax_rate || it.gst_rate) || 0,
          taxAmount: Number(it.tax_amount) || 0,
          cessAmount: Number(it.cess_amount) || 0,
          total: Number(it.total || it.amount) || 0,
          reason: it.reason || '',
        }));
        html = generateInvoiceHTML({
          type: 'return',
          invoiceNumber: ret.return_number || '',
          invoiceDate: ret.return_date || ret.created_at || '',
          business: businessInfo,
          customer: { name: ret.customer_name || ret.supplier_name || '' },
          supplierName: ret.supplier_name,
          items,
          subtotal: Number(ret.subtotal) || 0,
          taxAmount: Number(ret.tax_amount) || 0,
          totalAmount: Number(ret.total_amount) || 0,
          paymentStatus: ret.refund_status || ret.status,
        });
      } else if (docType === 'purchase_order') {
        const { data: po } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('id', entityId)
          .maybeSingle();
        if (!po) throw new Error('Purchase order not found');

        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('purchase_order_id', entityId)
          .eq('is_deleted', false);

        const items = (poItems || []).map((it: any) => ({
          name: it.product_name || it.name || '',
          hsnCode: it.hsn_code || '',
          quantity: Number(it.quantity) || 0,
          unit: it.primary_unit || it.unit || 'pcs',
          rate: Number(it.unit_price) || 0,
          discount: 0,
          taxRate: Number(it.tax_rate) || 0,
          taxAmount: Number(it.tax_amount) || 0,
          cessAmount: Number(it.cess_amount) || 0,
          total: Number(it.total_price || it.total) || 0,
        }));
        html = generateInvoiceHTML({
          type: 'purchase',
          invoiceNumber: po.po_number || '',
          invoiceDate: po.order_date || po.created_at || '',
          business: businessInfo,
          supplierName: po.supplier_name || '',
          items,
          subtotal: Number(po.subtotal) || 0,
          taxAmount: Number(po.tax_amount) || 0,
          totalAmount: Number(po.total_amount) || 0,
          notes: po.notes,
        });
      }

      if (html) {
        setDocViewerHtml(html);
      } else {
        Alert.alert('Error', 'Could not load document preview.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load document');
    } finally {
      setDocViewerLoading(false);
    }
  }, [bizData]);

  // ---- Helpers ----

  const isFromMe = useCallback(
    (msg: Message) => {
      if (senderId && msg.sender_id === senderId) return true;
      if (isStaff && staffId && msg.sender_id === staffId) return true;
      if (isStaff && userId && msg.sender_id === userId && msg.sender_type === 'staff') return true;
      if (!isStaff && userId && msg.sender_id === userId) return true;
      return false;
    },
    [senderId, isStaff, staffId, userId],
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const shouldShowDateHeader = (index: number) => {
    if (index === 0) return true;
    const cur = new Date(messages[index].created_at).toDateString();
    const prev = new Date(messages[index - 1].created_at).toDateString();
    return cur !== prev;
  };

  // ---- Render ----

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const mine = isFromMe(item);
      const showDate = shouldShowDateHeader(index);
      const selected = selectedMessages.has(item.id);

      const onLongPress = () => toggleSelectMessage(item.id);
      const onPress = () => {
        if (isSelecting) { toggleSelectMessage(item.id); return; }
      };

      return (
        <View>
          {showDate && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDateLabel(item.created_at)}</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={onLongPress}
            onPress={onPress}
            delayLongPress={400}
            style={[styles.selectRow, mine ? styles.rowRight : styles.rowLeft, selected && styles.selectedRow]}
          >
            {isSelecting && (
              <View style={styles.checkboxWrap}>
                {selected ? (
                  <CircleCheck size={22} color={Colors.primary} />
                ) : (
                  <View style={styles.emptyCheckbox} />
                )}
              </View>
            )}
            <View style={[styles.bubble, mine ? styles.bubbleSent : styles.bubbleReceived]}>
              {!mine && (
                <Text style={styles.senderLabel}>{item.sender_name}</Text>
              )}

              {item.message_type === 'file' ? (
                <TouchableOpacity
                  style={docCardStyles.container}
                  onPress={() => { if (isSelecting) { toggleSelectMessage(item.id); return; } handleOpenDocument(item); }}
                  activeOpacity={0.7}
                >
                  {(item.metadata?.document_type === 'payable_reminder' || item.metadata?.document_type === 'receivable_reminder') ? (
                    <Bell size={16} color={mine ? Colors.background : '#F59E0B'} />
                  ) : (
                    <FileText size={16} color={mine ? Colors.background : Colors.primary} />
                  )}
                  <Text style={[docCardStyles.title, mine ? styles.textSent : styles.textReceived]} numberOfLines={1}>
                    {item.metadata?.entity_number || item.content?.split('\n')[0] || 'Document'}
                  </Text>
                  <Text style={[docCardStyles.amount, mine ? { color: 'rgba(255,255,255,0.7)' } : { color: Colors.textLight }]} numberOfLines={1}>
                    {item.content?.split('\n').find(l => l.includes('₹')) || ''}
                  </Text>
                </TouchableOpacity>
              ) : item.message_type === 'image' && item.media_url ? (
                <View>
                  <Image source={{ uri: item.media_url }} style={styles.msgImage} resizeMode="cover" />
                  {item.content && item.content !== '📷 Photo' && item.content !== '🎬 Video' && (
                    <Text style={[styles.msgText, mine ? styles.textSent : styles.textReceived]}>{item.content}</Text>
                  )}
                </View>
              ) : item.message_type === 'audio' && item.media_url ? (
                <View style={styles.audioRow}>
                  <TouchableOpacity
                    style={[styles.audioBtn, mine ? styles.audioBtnSent : styles.audioBtnReceived]}
                    onPress={() => playingMessageId === item.id ? stopAudio() : playAudio(item.media_url!, item.id)}
                    activeOpacity={0.7}
                  >
                    {playingMessageId === item.id ? (
                      <Pause size={16} color={mine ? Colors.background : Colors.primary} />
                    ) : (
                      <Play size={16} color={mine ? Colors.background : Colors.primary} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.audioBody}>
                    <Text style={[styles.msgText, mine ? styles.textSent : styles.textReceived]}>Voice message</Text>
                    <View style={styles.seekTrack}>
                      <View style={[styles.seekProgress, { width: playingMessageId === item.id ? `${audioProgress}%` : '0%', backgroundColor: mine ? Colors.background : Colors.primary }]} />
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={[styles.msgText, mine ? styles.textSent : styles.textReceived]}>{item.content}</Text>
              )}

              <Text style={[styles.timestamp, mine ? styles.timestampSent : styles.timestampReceived]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [isFromMe, playingMessageId, audioProgress, playAudio, stopAudio, messages, selectedMessages, isSelecting, toggleSelectMessage, handleOpenDocument],
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          {isSelecting ? (
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedMessages(new Set())} activeOpacity={0.7}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerName, { flex: 1, marginLeft: 8 }]}>{selectedMessages.size} selected</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSelected} activeOpacity={0.7}>
                <Trash2 size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(name as string)}</Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
                  <Text style={styles.headerSub}>{type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.searchToggle}
                onPress={() => { setShowSearch(!showSearch); if (showSearch) setMsgSearch(''); }}
                activeOpacity={0.7}
              >
                {showSearch ? <X size={20} color={Colors.textLight} /> : <Search size={20} color={Colors.textLight} />}
              </TouchableOpacity>
            </View>
          )}
          {showSearch && (
            <View style={styles.msgSearchBar}>
              <Search size={16} color={Colors.textLight} />
              <TextInput
                style={styles.msgSearchInput}
                placeholder="Search messages..."
                placeholderTextColor={Colors.textLight}
                value={msgSearch}
                onChangeText={setMsgSearch}
                autoFocus
              />
              {msgSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMsgSearch('')} activeOpacity={0.7}>
                  <X size={16} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>

        {/* Message list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={msgSearch.trim() ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase())) : messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>
              Recording... {formatDuration(recordingDuration)}
            </Text>
          </View>
        )}

        {/* Input area */}
        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textLight}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              {!inputText.trim() ? (
                <>
                  <TouchableOpacity style={styles.inlineIcon} onPress={handlePickImage} activeOpacity={0.7}>
                    <ImageIcon size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inlineIcon}
                    onPress={() => setShowAttachMenu(true)}
                    activeOpacity={0.7}
                  >
                    <Plus size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.inlineIcon}
                  onPress={() => setShowAttachMenu(true)}
                  activeOpacity={0.7}
                >
                  <Paperclip size={18} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {inputText.trim() ? (
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.7}
              >
                <ArrowRight size={20} color={Colors.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, isRecording && styles.recordingActive]}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.7}
              >
                {isRecording ? (
                  <Square size={20} color={Colors.background} />
                ) : (
                  <Mic size={20} color={Colors.background} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* Attachment Menu */}
        <Modal visible={showAttachMenu} animationType="fade" transparent onRequestClose={() => setShowAttachMenu(false)}>
          <TouchableOpacity style={attachStyles.overlay} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
            <View style={attachStyles.menu}>
              {isBusinessParty && (
                <TouchableOpacity style={attachStyles.item} onPress={() => { setShowAttachMenu(false); setShowDocPicker(true); }} activeOpacity={0.7}>
                  <View style={[attachStyles.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
                    <FileText size={22} color={Colors.primary} />
                  </View>
                  <Text style={attachStyles.label}>Documents</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={attachStyles.item} onPress={() => { setShowAttachMenu(false); handleTakePhoto(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconCircle, { backgroundColor: '#059669' + '15' }]}>
                  <Camera size={22} color="#059669" />
                </View>
                <Text style={attachStyles.label}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={attachStyles.item} onPress={() => { setShowAttachMenu(false); handlePickImage(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconCircle, { backgroundColor: '#7C3AED' + '15' }]}>
                  <ImageIcon size={22} color="#7C3AED" />
                </View>
                <Text style={attachStyles.label}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={attachStyles.item} onPress={() => { setShowAttachMenu(false); handlePickVideo(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconCircle, { backgroundColor: '#DC2626' + '15' }]}>
                  <Video size={22} color="#DC2626" />
                </View>
                <Text style={attachStyles.label}>Video</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>

      {/* Document Picker Modal */}
      <Modal visible={showDocPicker} animationType="slide" transparent>
        <View style={docPickerStyles.overlay}>
          <View style={docPickerStyles.sheet}>
            <View style={docPickerStyles.handle} />
            <View style={docPickerStyles.header}>
              <Text style={docPickerStyles.title}>
                {docPickerCategory ? docPickerCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Send Document'}
              </Text>
              <TouchableOpacity onPress={() => { setShowDocPicker(false); setDocPickerCategory(null); setDocPickerItems([]); }}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {!docPickerCategory ? (
              <View style={docPickerStyles.categories}>
                {type === 'supplier' ? (
                  <>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('purchase_orders')}>
                      <ClipboardList size={24} color={Colors.primary} />
                      <Text style={docPickerStyles.catLabel}>Purchase Orders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('purchase_invoices')}>
                      <FileText size={24} color="#059669" />
                      <Text style={docPickerStyles.catLabel}>Purchase Invoices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('returns')}>
                      <RotateCcw size={24} color="#DC2626" />
                      <Text style={docPickerStyles.catLabel}>Returns</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('payment_reminders')}>
                      <Bell size={24} color="#F59E0B" />
                      <Text style={docPickerStyles.catLabel}>Payment Reminders</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('sales_invoices')}>
                      <ShoppingCart size={24} color={Colors.primary} />
                      <Text style={docPickerStyles.catLabel}>Sales Invoices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('returns')}>
                      <RotateCcw size={24} color="#DC2626" />
                      <Text style={docPickerStyles.catLabel}>Return Invoices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={docPickerStyles.catBtn} onPress={() => loadDocPickerCategory('payment_reminders')}>
                      <Bell size={24} color="#F59E0B" />
                      <Text style={docPickerStyles.catLabel}>Payment Reminders</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : docPickerLoading ? (
              <View style={docPickerStyles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView style={docPickerStyles.listWrap}>
                {docPickerItems.length === 0 ? (
                  <Text style={docPickerStyles.emptyText}>
                    {docPickerCategory === 'payment_reminders'
                      ? `No outstanding ${type === 'supplier' ? 'payables' : 'receivables'} for this ${type || 'party'}.`
                      : `No documents found for this ${type || 'party'}.`}
                  </Text>
                ) : (
                  docPickerItems.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={docPickerStyles.docRow}
                      onPress={() => handleSendDocument(doc)}
                      activeOpacity={0.7}
                    >
                      {doc.type === 'payable_reminder' || doc.type === 'receivable_reminder' ? (
                        <Bell size={18} color="#F59E0B" />
                      ) : (
                        <FileText size={18} color={Colors.primary} />
                      )}
                      <View style={docPickerStyles.docInfo}>
                        <Text style={docPickerStyles.docLabel}>{doc.label}</Text>
                        <Text style={docPickerStyles.docSub}>
                          {formatCurrencyINR(doc.amount || 0)} · {new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <Send size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  ))
                )}
                <TouchableOpacity
                  style={docPickerStyles.backBtn}
                  onPress={() => { setDocPickerCategory(null); setDocPickerItems([]); }}
                >
                  <ArrowLeft size={16} color={Colors.primary} />
                  <Text style={docPickerStyles.backBtnText}>Back to categories</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal visible={!!docViewerHtml || docViewerLoading} animationType="slide" onRequestClose={() => { setDocViewerHtml(null); setDocViewerLoading(false); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={docViewerStyles.header}>
            <TouchableOpacity onPress={() => { setDocViewerHtml(null); setDocViewerLoading(false); }} style={docViewerStyles.closeBtn}>
              <ArrowLeft size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={docViewerStyles.title} numberOfLines={1}>{docViewerTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
          {docViewerLoading ? (
            <View style={docViewerStyles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={docViewerStyles.loadingText}>Loading document...</Text>
            </View>
          ) : docViewerHtml ? (
            Platform.OS === 'web' ? (
              <iframe
                srcDoc={docViewerHtml}
                style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
                title={docViewerTitle}
              />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: docViewerHtml }}
                style={{ flex: 1 }}
                scalesPageToFit
                javaScriptEnabled
                bounces
                showsVerticalScrollIndicator
                startInLoadingState
                renderLoading={() => (
                  <View style={docViewerStyles.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                )}
              />
            )
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const docViewerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  flex: {
    flex: 1,
  },

  // Header
  headerSafe: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchToggle: {
    padding: 8,
    borderRadius: 8,
  },
  msgSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 8,
  },
  msgSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: Colors.textLight,
    fontSize: 14,
  },

  // Date separator
  dateContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textLight,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Message rows
  row: {
    marginVertical: 2,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    paddingHorizontal: 2,
  },
  selectedRow: {
    backgroundColor: Colors.primary + '12',
    borderRadius: 12,
  },
  checkboxWrap: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  emptyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.grey[300],
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },

  // Bubbles
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleSent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textSent: {
    color: Colors.background,
  },
  textReceived: {
    color: Colors.text,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampSent: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampReceived: {
    color: Colors.textLight,
  },

  // Image message
  msgImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },

  // Audio message
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBtnSent: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  audioBtnReceived: {
    backgroundColor: Colors.grey[100],
  },
  audioBody: {
    flex: 1,
    gap: 4,
  },
  seekTrack: {
    height: 4,
    backgroundColor: Colors.grey[300],
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekProgress: {
    height: '100%',
    borderRadius: 2,
  },

  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 6,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  recordingLabel: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: '500',
  },

  // Input area
  inputSafe: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    minHeight: 40,
    maxHeight: 120,
  },
  inlineIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  recordingActive: {
    backgroundColor: Colors.error,
  },
});

const docCardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  amount: {
    fontSize: 12,
    flexShrink: 0,
  },
});

const docPickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.grey[300],
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  categories: {
    padding: 20,
    gap: 12,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  catLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  listWrap: {
    padding: 16,
    maxHeight: 400,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 14,
    paddingVertical: 30,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  docSub: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});

const attachStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  item: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
});
