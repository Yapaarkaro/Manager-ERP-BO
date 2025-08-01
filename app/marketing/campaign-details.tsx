import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  IndianRupee, 
  Users, 
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  BarChart3,
  Activity,
  MapPin,
  MessageSquare
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

interface MarketingCampaign {
  id: string;
  name: string;
  platform: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  targetAudience: string[];
  objective: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  createdAt: string;
}

export default function CampaignDetailsScreen() {
  const { campaignId, campaignData } = useLocalSearchParams();
  
  let campaign: MarketingCampaign | null = null;
  try {
    campaign = JSON.parse(campaignData as string);
  } catch (error) {
    console.error('Error parsing campaign data:', error);
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Campaign Details</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Campaign not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'completed':
        return Colors.primary;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp size={20} color={Colors.success} />;
      case 'completed':
        return <CheckCircle size={20} color={Colors.primary} />;
      case 'pending':
        return <Clock size={20} color={Colors.warning} />;
      case 'cancelled':
        return <XCircle size={20} color={Colors.error} />;
      default:
        return <Clock size={20} color={Colors.textLight} />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateCTR = () => {
    if (campaign.impressions === 0) return 0;
    return ((campaign.clicks / campaign.impressions) * 100).toFixed(2);
  };

  const calculateConversionRate = () => {
    if (campaign.clicks === 0) return 0;
    return ((campaign.conversions / campaign.clicks) * 100).toFixed(2);
  };

  const calculateCPC = () => {
    if (campaign.clicks === 0) return 0;
    return (campaign.spend / campaign.clicks).toFixed(2);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Campaign Details</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Campaign Header */}
          <View style={styles.campaignHeader}>
            <View style={styles.campaignInfo}>
              <Text style={styles.campaignName}>{campaign.name}</Text>
              <View style={styles.platformBadge}>
                <Text style={styles.platformText}>{campaign.platform}</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              {getStatusIcon(campaign.status)}
              <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Campaign Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Overview</Text>
            <View style={styles.overviewCard}>
              <View style={styles.overviewRow}>
                <Calendar size={20} color={Colors.textLight} />
                <Text style={styles.overviewLabel}>Duration</Text>
                <Text style={styles.overviewValue}>
                  {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                </Text>
              </View>
              
              <View style={styles.overviewRow}>
                <IndianRupee size={20} color={Colors.textLight} />
                <Text style={styles.overviewLabel}>Budget</Text>
                <Text style={styles.overviewValue}>{formatAmount(campaign.budget)}</Text>
              </View>
              
              <View style={styles.overviewRow}>
                <Target size={20} color={Colors.textLight} />
                <Text style={styles.overviewLabel}>Objective</Text>
                <Text style={styles.overviewValue}>{campaign.objective}</Text>
              </View>
              
              <View style={styles.overviewRow}>
                <Users size={20} color={Colors.textLight} />
                <Text style={styles.overviewLabel}>Target Audience</Text>
                <Text style={styles.overviewValue}>
                  {campaign.targetAudience.join(', ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance Metrics */}
          {(campaign.status === 'active' || campaign.status === 'completed') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Eye size={20} color={Colors.primary} />
                    <Text style={styles.metricLabel}>Impressions</Text>
                  </View>
                  <Text style={styles.metricValue}>{campaign.impressions.toLocaleString()}</Text>
                </View>
                
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <MessageSquare size={20} color={Colors.primary} />
                    <Text style={styles.metricLabel}>Clicks</Text>
                  </View>
                  <Text style={styles.metricValue}>{campaign.clicks.toLocaleString()}</Text>
                </View>
                
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <CheckCircle size={20} color={Colors.primary} />
                    <Text style={styles.metricLabel}>Conversions</Text>
                  </View>
                  <Text style={styles.metricValue}>{campaign.conversions.toLocaleString()}</Text>
                </View>
                
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <IndianRupee size={20} color={Colors.primary} />
                    <Text style={styles.metricLabel}>Spent</Text>
                  </View>
                  <Text style={styles.metricValue}>{formatAmount(campaign.spend)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Performance Analytics */}
          {(campaign.status === 'active' || campaign.status === 'completed') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsRow}>
                  <BarChart3 size={20} color={Colors.textLight} />
                  <Text style={styles.analyticsLabel}>Click-Through Rate (CTR)</Text>
                  <Text style={styles.analyticsValue}>{calculateCTR()}%</Text>
                </View>
                
                <View style={styles.analyticsRow}>
                  <Activity size={20} color={Colors.textLight} />
                  <Text style={styles.analyticsLabel}>Conversion Rate</Text>
                  <Text style={styles.analyticsValue}>{calculateConversionRate()}%</Text>
                </View>
                
                <View style={styles.analyticsRow}>
                  <IndianRupee size={20} color={Colors.textLight} />
                  <Text style={styles.analyticsLabel}>Cost Per Click (CPC)</Text>
                  <Text style={styles.analyticsValue}>₹{calculateCPC()}</Text>
                </View>
                
                <View style={styles.analyticsRow}>
                  <TrendingUp size={20} color={Colors.textLight} />
                  <Text style={styles.analyticsLabel}>Budget Utilization</Text>
                  <Text style={styles.analyticsValue}>
                    {((campaign.spend / campaign.budget) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Campaign Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Timeline</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{formatDate(campaign.createdAt)}</Text>
                  <Text style={styles.timelineTitle}>Campaign Created</Text>
                </View>
              </View>
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{formatDate(campaign.startDate)}</Text>
                  <Text style={styles.timelineTitle}>Campaign Started</Text>
                </View>
              </View>
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{formatDate(campaign.endDate)}</Text>
                  <Text style={styles.timelineTitle}>Campaign Ended</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  platformBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  platformText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overviewCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    minWidth: 120,
  },
  overviewValue: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  analyticsCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analyticsLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  timelineCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  timelineTitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 2,
  },
}); 