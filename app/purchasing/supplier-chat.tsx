import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Search, X, Phone, Video, MoveVertical as MoreVertical, Paperclip, Camera, Mic, Check, CheckCheck, Play, Pause, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'audio';
  attachment?: {
    url: string;
    name: string;
    size?: string;
  };
  audioUri?: string;
  audioDuration?: number;
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    text: 'Hello! I wanted to discuss the latest purchase order PO-2024-001.',
    timestamp: '2024-01-16T09:30:00Z',
    isFromMe: true,
    status: 'read',
    type: 'text'
  },
  {
    id: '2',
    text: 'Hi! Yes, I received the PO. We can deliver all items within 3-5 business days.',
    timestamp: '2024-01-16T09:35:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '3',
    text: 'Great! What about the pricing for bulk orders? Any discounts available?',
    timestamp: '2024-01-16T09:40:00Z',
    isFromMe: true,
    status: 'read',
    type: 'text'
  },
  {
    id: '4',
    text: 'For orders above ₹5 lakhs, we offer 3% discount. For above ₹10 lakhs, it\'s 5%.',
    timestamp: '2024-01-16T09:42:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '5',
    text: 'Perfect! Can you send me the updated price list?',
    timestamp: '2024-01-16T09:45:00Z',
    isFromMe: true,
    status: 'delivered',
    type: 'text'
  },
  {
    id: '6',
    text: 'Sure, sending the latest price list now.',
    timestamp: '2024-01-16T09:47:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '7',
    text: 'INV-035.PDF',
    timestamp: '2024-01-16T09:48:00Z',
    isFromMe: false,
    status: 'read',
    type: 'file',
    attachment: {
      url: 'https://example.com/invoice-035.pdf',
      name: 'INV-035.PDF',
      size: '1.8 MB'
    }
  },
  {
    id: '8',
    text: 'Here\'s the product catalog with latest images.',
    timestamp: '2024-01-16T10:05:00Z',
    isFromMe: false,
    status: 'read',
    type: 'image',
    attachment: {
      url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      name: 'product_catalog.jpg',
      size: '1.2 MB'
    }
  },
  {
    id: '9',
    text: 'Perfect! The quality looks great.',
    timestamp: '2024-01-16T10:08:00Z',
    isFromMe: true,
    status: 'read',
    type: 'text'
  },
  {
    id: '10',
    text: 'Thank you! I\'ll review this and get back to you.',
    timestamp: '2024-01-16T10:00:00Z',
    isFromMe: true,
    status: 'sent',
    type: 'text'
  },
  {
    id: '11',
    text: 'Voice message',
    timestamp: '2024-01-16T10:05:00Z',
    isFromMe: true,
    status: 'read',
    type: 'audio',
    audioUri: 'mock-audio-1.m4a',
    audioDuration: 15
  },
  {
    id: '12',
    text: 'Voice message',
    timestamp: '2024-01-16T10:06:00Z',
    isFromMe: false,
    status: 'read',
    type: 'audio',
    audioUri: 'mock-audio-2.m4a',
    audioDuration: 8
  },
];

export default function SupplierChatScreen() {
  const { supplierId, supplierName, supplierAvatar, supplierPhoneNumber } = useLocalSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [recordingLoaded, setRecordingLoaded] = useState(false);
  
  // Audio playback states
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (sound) {
            await sound.unloadAsync();
          }
          if (recording && recordingLoaded) {
            await recording.stopAndUnloadAsync();
          }
          if (recordingTimer) {
            clearInterval(recordingTimer);
          }
        } catch (error) {
          // Ignore cleanup errors as they're not critical
        }
      };
      cleanup();
    };
  }, [sound, recording, recordingTimer, recordingLoaded]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isFromMe: true,
      status: 'sent',
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered' as const }
            : msg
        )
      );
    }, 1000);
  };

  const handlePhoneCall = async () => {
    try {
      // Get supplier phone number from params or use a default
      let supplierPhone = supplierPhoneNumber || '9876543210'; // Default number without prefix
      
      // Add +91 prefix if not already present
      if (!supplierPhone.startsWith('+91') && !supplierPhone.startsWith('+')) {
        supplierPhone = `+91${supplierPhone}`;
      }
      
      console.log('Opening phone dialer with number:', supplierPhone);
      
      // Directly open the phone dialer without validation
      await Linking.openURL(`tel:${supplierPhone}`);
      
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert(
        'Error',
        'Unable to open phone dialer. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingLoaded(true);
      
      // Start timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Clear timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      
      setIsRecording(false);
      setRecording(null);
      setRecordingLoaded(false);
      
      if (uri) {
        // Create audio message
        const audioMessage: ChatMessage = {
          id: Date.now().toString(),
          text: 'Voice message',
          timestamp: new Date().toISOString(),
          isFromMe: true,
          status: 'sent',
          type: 'audio',
          audioUri: uri,
          audioDuration: recordingDuration,
        };
        
        setMessages(prev => [...prev, audioMessage]);
        setRecordingDuration(0);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const playAudio = async (audioUri: string, messageId: string) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Check if it's a mock URI (for testing)
      if (audioUri.includes('mock-audio')) {
        console.log('Skipping mock audio playback');
        return;
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, volume: 1.0, progressUpdateIntervalMillis: 200 }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setPlayingMessageId(messageId);
      setAudioProgress(0);
      
      // Listen for playback status
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayingMessageId(null);
            setAudioProgress(0);
          } else if (status.positionMillis && status.durationMillis) {
            const progress = (status.positionMillis / status.durationMillis) * 100;
            setAudioProgress(progress);
          }
        }
      });
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      setPlayingMessageId(null);
      setAudioProgress(0);
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setPlayingMessageId(null);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMessages([]);
    } else {
      const filtered = messages.filter(message =>
        message.text.toLowerCase().includes(query.toLowerCase()) ||
        message.attachment?.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check size={14} color={Colors.textLight} />;
      case 'delivered': return <CheckCheck size={14} color={Colors.textLight} />;
      case 'read': return <CheckCheck size={14} color={Colors.primary} />;
      default: return null;
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const showDate = index === 0 || 
      formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

    return (
      <View key={message.id}>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(message.timestamp)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          message.isFromMe ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
          <View style={[
            styles.messageBubble,
            message.isFromMe ? styles.myMessageBubble : styles.theirMessageBubble
          ]}>
            {message.type === 'file' && message.attachment ? (
              <View style={styles.fileAttachment}>
                <View style={styles.fileIcon}>
                  <Text style={styles.fileIconText}>PDF</Text>
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{message.attachment.name}</Text>
                  {message.attachment.size && (
                    <Text style={styles.fileSize}>{message.attachment.size}</Text>
                  )}
                </View>
              </View>
            ) : message.type === 'image' && message.attachment ? (
              <View style={styles.imageAttachment}>
                <Image 
                  source={{ uri: message.attachment.url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {message.text && (
                  <Text style={[
                    styles.messageText,
                    message.isFromMe ? styles.myMessageText : styles.theirMessageText
                  ]}>
                    {message.text}
                  </Text>
                )}
              </View>
            ) : message.type === 'audio' && message.audioUri ? (
              <View style={styles.audioMessageContainer}>
                <TouchableOpacity
                  style={[
                    styles.audioPlayButton,
                    message.isFromMe ? styles.myAudioPlayButton : styles.theirAudioPlayButton
                  ]}
                  onPress={() => {
                    if (isPlaying && playingMessageId === message.id) {
                      stopAudio();
                    } else {
                      playAudio(message.audioUri!, message.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {isPlaying && playingMessageId === message.id ? (
                    <Pause size={16} color={message.isFromMe ? Colors.background : Colors.primary} />
                  ) : (
                    <Play size={16} color={message.isFromMe ? Colors.background : Colors.primary} />
                  )}
                </TouchableOpacity>
                
                <View style={styles.audioContent}>
                  <Text style={[
                    styles.audioText,
                    message.isFromMe ? styles.myMessageText : styles.theirMessageText
                  ]}>
                    Voice message
                  </Text>
                  
                  <View style={styles.audioSeekBar}>
                    <View style={styles.audioSeekBarBackground}>
                      <View 
                        style={[
                          styles.audioSeekBarProgress,
                          { 
                            width: isPlaying && playingMessageId === message.id ? `${audioProgress}%` : '0%',
                            backgroundColor: message.isFromMe ? Colors.background : Colors.primary
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  
                  {message.audioDuration && (
                    <Text style={[
                      styles.audioDuration,
                      message.isFromMe ? styles.myMessageTime : styles.theirMessageTime
                    ]}>
                      {formatDuration(message.audioDuration)}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={[
                styles.messageText,
                message.isFromMe ? styles.myMessageText : styles.theirMessageText
              ]}>
                {message.text}
              </Text>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                message.isFromMe ? styles.myMessageTime : styles.theirMessageTime
              ]}>
                {formatTime(message.timestamp)}
              </Text>
              {message.isFromMe && (
                <View style={styles.messageStatus}>
                  {getMessageStatusIcon(message.status)}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const displayMessages = showSearch && searchQuery ? filteredMessages : messages;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/dashboard')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Image 
                source={{ uri: supplierAvatar as string }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>{supplierName}</Text>
                <Text style={styles.headerStatus}>Online</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handlePhoneCall}
                activeOpacity={0.7}
              >
                <Phone size={18} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setShowSearch(!showSearch)}
                activeOpacity={0.7}
              >
                <Search size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search messages..."
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.searchCloseButton}
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setFilteredMessages([]);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={16} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              {searchQuery && (
                <Text style={styles.searchResults}>
                  {filteredMessages.length} messages found
                </Text>
              )}
            </View>
          )}
        </SafeAreaView>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {displayMessages.map((message, index) => renderMessage(message, index))}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.messageInputContainer}>
          <View style={styles.messageInputRow}>
            <View style={styles.messageInputWrapper}>
              <TextInput
                style={styles.messageTextInput}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textLight}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                android_ripple={false}
              />
              
              {/* Icons inside input field */}
              <View style={styles.inputIconsContainer}>
                <TouchableOpacity
                  style={styles.inputIconButton}
                  onPress={() => console.log('Attach file')}
                  activeOpacity={0.7}
                >
                  <Paperclip size={16} color={Colors.textLight} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.inputIconButton}
                  onPress={() => console.log('Camera')}
                  activeOpacity={0.7}
                >
                  <Camera size={16} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Voice recording button outside */}
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.recordingButton
              ]}
              onPress={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              activeOpacity={0.7}
            >
              {isRecording ? (
                <Square size={20} color={Colors.background} />
              ) : (
                <Mic size={20} color={Colors.background} />
              )}
            </TouchableOpacity>
            
            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingText}>
                  Recording... {formatDuration(recordingDuration)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  keyboardView: {
    flex: 1,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  headerStatus: {
    fontSize: 11,
    color: Colors.success,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  searchCloseButton: {
    padding: 4,
  },
  searchResults: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
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
  messageContainer: {
    marginVertical: 2,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: Colors.background,
  },
  theirMessageText: {
    color: Colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  theirMessageTime: {
    color: Colors.textLight,
  },
  messageStatus: {
    marginLeft: 2,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    gap: 8,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.background,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageInputContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageInputWrapper: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTextInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingRight: 8,
  },
  inputIconsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  fileType: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  imageAttachment: {
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  recordingButton: {
    backgroundColor: Colors.error,
  },
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: 280,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  myAudioPlayButton: {
    backgroundColor: Colors.background,
  },
  theirAudioPlayButton: {
    backgroundColor: Colors.grey[100],
  },
  audioContent: {
    flex: 1,
    gap: 6,
  },
  audioText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  audioDuration: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },
  audioSeekBar: {
    height: 4,
    marginVertical: 4,
  },
  audioSeekBarBackground: {
    height: 4,
    backgroundColor: Colors.grey[300],
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioSeekBarProgress: {
    height: '100%',
    borderRadius: 2,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  recordingText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500',
  },
});