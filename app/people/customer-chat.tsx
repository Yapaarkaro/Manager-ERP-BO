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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Search, X, Phone, Video, Paperclip, Camera, Mic, Check, CheckCheck } from 'lucide-react-native';

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
  type: 'text' | 'image' | 'file';
  attachment?: {
    url: string;
    name: string;
    size?: string;
  };
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    text: 'Hello! Thank you for your recent order. How was your experience with our products?',
    timestamp: '2024-01-16T09:30:00Z',
    isFromMe: true,
    status: 'read',
    type: 'text'
  },
  {
    id: '2',
    text: 'Hi! The products are excellent quality. Very satisfied with the iPhone 14 Pro.',
    timestamp: '2024-01-16T09:35:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '3',
    text: 'That\'s great to hear! We have some new MacBook models coming in next week. Would you be interested?',
    timestamp: '2024-01-16T09:40:00Z',
    isFromMe: true,
    status: 'read',
    type: 'text'
  },
  {
    id: '4',
    text: 'Yes, definitely! Can you send me the specifications and pricing?',
    timestamp: '2024-01-16T09:42:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '5',
    text: 'Sure! I\'ll send you the complete product catalog with pricing.',
    timestamp: '2024-01-16T09:45:00Z',
    isFromMe: true,
    status: 'delivered',
    type: 'text'
  },
  {
    id: '6',
    text: 'MacBook_Catalog_January_2024.pdf',
    timestamp: '2024-01-16T09:47:00Z',
    isFromMe: true,
    status: 'read',
    type: 'file',
    attachment: {
      url: 'https://example.com/catalog.pdf',
      name: 'MacBook_Catalog_January_2024.pdf',
      size: '3.2 MB'
    }
  },
  {
    id: '7',
    text: 'Perfect! I\'ll review this and place an order soon. Also, do you offer bulk discounts?',
    timestamp: '2024-01-16T10:00:00Z',
    isFromMe: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '8',
    text: 'Yes, we offer 5% discount for orders above ₹5 lakhs and 8% for orders above ₹10 lakhs.',
    timestamp: '2024-01-16T10:05:00Z',
    isFromMe: true,
    status: 'sent',
    type: 'text'
  },
];

export default function CustomerChatScreen() {
  const { customerId, customerName, customerAvatar } = useLocalSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

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
      case 'read': return <CheckCheck size={14} color={Colors.success} />;
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
                  <Paperclip size={16} color={Colors.success} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{message.attachment.name}</Text>
                  {message.attachment.size && (
                    <Text style={styles.fileSize}>{message.attachment.size}</Text>
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
      >
        {/* Header */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Image 
                source={{ uri: customerAvatar as string }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{customerName}</Text>
                <Text style={styles.headerStatus}>Online</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setShowSearch(!showSearch)}
                activeOpacity={0.7}
              >
                <Search size={20} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => console.log('Voice call')}
                activeOpacity={0.7}
              >
                <Phone size={20} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => console.log('Video call')}
                activeOpacity={0.7}
              >
                <Video size={20} color={Colors.text} />
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
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => console.log('Attach file')}
              activeOpacity={0.7}
            >
              <Paperclip size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textLight}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={1000}
              />
            </View>

            {newMessage.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                activeOpacity={0.7}
              >
                <Send size={20} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={() => console.log('Voice message')}
                activeOpacity={0.7}
              >
                <Mic size={20} color={Colors.textLight} />
              </TouchableOpacity>
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
    paddingVertical: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.success,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    backgroundColor: Colors.success,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  inputContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
});