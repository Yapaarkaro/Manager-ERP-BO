import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  CheckCircle,
  Home,
  Package,
  ArrowRight,
} from 'lucide-react-native';

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

export default function SuccessScreen() {
  // Log successful stock out completion
  React.useEffect(() => {
    console.log('=== STOCK OUT COMPLETED SUCCESSFULLY ===');
    console.log('Completed at:', new Date().toISOString());
    console.log('User can now view updated inventory levels');
    console.log('==========================================');
  }, []);

  const handleGoToDashboard = () => {
    console.log('=== NAVIGATING TO DASHBOARD ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('===============================');
    router.replace('/dashboard');
  };

  const handleViewInventory = () => {
    console.log('=== NAVIGATING TO INVENTORY ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('================================');
    router.replace('/inventory');
  };

  const handleNewStockOut = () => {
    console.log('=== STARTING NEW STOCK OUT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('=============================');
    router.replace('/inventory/stock-out');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={Colors.success} />
          </View>
        </View>

        {/* Success Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.successTitle}>Stock Out Successful!</Text>
          <Text style={styles.successDescription}>
            Your inventory has been updated successfully. The stock out has been recorded in your system.
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>What Happened</Text>
          
          <View style={styles.summaryItem}>
            <Package size={20} color={Colors.primary} />
            <Text style={styles.summaryText}>
              Inventory levels have been reduced according to your specifications
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <CheckCircle size={20} color={Colors.success} />
            <Text style={styles.summaryText}>
              Stock out transaction has been recorded with all details
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Package size={20} color={Colors.warning} />
            <Text style={styles.summaryText}>
              You can view updated inventory levels in the inventory section
            </Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleViewInventory}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Package size={24} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Updated Inventory</Text>
              <Text style={styles.actionDescription}>
                Check your current inventory levels and stock status
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleNewStockOut}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Package size={24} color={Colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Another Stock Out</Text>
              <Text style={styles.actionDescription}>
                Process another stock out transaction
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.warning} />
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipText}>
            • Regularly review your inventory levels to maintain optimal stock
          </Text>
          <Text style={styles.tipText}>
            • Keep detailed notes for future reference and audit purposes
          </Text>
          <Text style={styles.tipText}>
            • Monitor low stock alerts to prevent stockouts
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={handleGoToDashboard}
          activeOpacity={0.8}
        >
          <Home size={20} color={Colors.background} />
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  nextStepsContainer: {
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dashboardButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    marginLeft: 8,
  },
}); 