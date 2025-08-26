import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import AnimatedSearchBar from '@/components/AnimatedSearchBar';

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

// Mock data for demonstration
const mockItems = [
  { id: '1', title: 'Sales Invoice INV-001', subtitle: 'Customer: John Doe', amount: '₹15,000' },
  { id: '2', title: 'Sales Invoice INV-002', subtitle: 'Customer: Jane Smith', amount: '₹25,000' },
  { id: '3', title: 'Return RET-001', subtitle: 'Customer: Bob Johnson', amount: '₹5,000' },
  { id: '4', title: 'Purchase Order PO-001', subtitle: 'Supplier: ABC Corp', amount: '₹50,000' },
  { id: '5', title: 'Stock Item iPhone 14', subtitle: 'Category: Electronics', amount: '₹129,999' },
];

export default function DemoSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(mockItems);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredItems(mockItems);
    } else {
      const filtered = mockItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  };

  const handleFilter = () => {
    console.log('Filter pressed');
  };

  const handleItemPress = (item: any) => {
    console.log('Item pressed:', item);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Animated Search Demo</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • Tap the search bar to focus{'\n'}
            • Keyboard opens and search bar animates to top{'\n'}
            • Search results appear below the search bar{'\n'}
            • Hit enter to keep keyboard open and search bar at top{'\n'}
            • Tap outside or hide keyboard to return to normal
          </Text>
        </View>

        <View style={styles.sampleContainer}>
          <Text style={styles.sampleTitle}>Sample Items:</Text>
          {mockItems.map(item => (
            <View key={item.id} style={styles.sampleItem}>
              <Text style={styles.sampleItemTitle}>{item.title}</Text>
              <Text style={styles.sampleItemSubtitle}>{item.subtitle}</Text>
              <Text style={styles.sampleItemAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Animated Search Bar with Safe Area */}
      <AnimatedSearchBar
        placeholder="Search invoices, returns, stock..."
        value={searchQuery}
        onChangeText={handleSearch}
        onFilterPress={handleFilter}
        safeAreaEdges={['bottom']}
        bottomPadding={20}

      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  infoContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  sampleContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sampleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  sampleItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  sampleItemSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
    marginRight: 12,
  },
  sampleItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  // Search Results Styles
  searchResultsContainer: {
    paddingVertical: 8,
  },
  searchResultItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    marginRight: 12,
  },
  searchResultAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  noSearchResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noSearchResultsText: {
    fontSize: 16,
    color: Colors.textLight,
  },
});
