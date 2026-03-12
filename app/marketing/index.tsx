import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { safeRouter } from '@/utils/safeRouter';
import { getCampaigns } from '@/services/backendApi';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  IndianRupee, 
  Users, 
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye
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

const mapCampaignFromDb = (c: any): MarketingCampaign => {
  const parseTargetAudience = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.map(String) : [v];
      } catch {
        return v ? [v] : [];
      }
    }
    return [];
  };
  return {
    id: c.id,
    name: c.name || '',
    platform: c.platform || '',
    startDate: c.start_date || '',
    endDate: c.end_date || '',
    budget: c.budget ?? 0,
    spend: c.spend ?? 0,
    status: (c.status || 'pending') as MarketingCampaign['status'],
    targetAudience: parseTargetAudience(c.target_audience),
    objective: c.objective || '',
    impressions: c.impressions ?? 0,
    clicks: c.clicks ?? 0,
    conversions: c.conversions ?? 0,
    createdAt: c.created_at || '',
  };
};

export default function MarketingScreen() {
  const { handleBack } = useWebBackNavigation();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCampaigns, setFilteredCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed' | 'pending' | 'cancelled'>('all');

  useEffect(() => {
    (async () => {
      const { success, campaigns: data } = await getCampaigns();
      if (success && data) {
        setCampaigns(data.map(mapCampaignFromDb));
      }
    })();
  }, []);

  useEffect(() => {
    let filtered = campaigns;
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.objective.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === selectedFilter);
    }
    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, selectedFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = campaigns;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(query.toLowerCase()) ||
        campaign.platform.toLowerCase().includes(query.toLowerCase()) ||
        campaign.objective.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === filter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleCampaignPress = (campaign: MarketingCampaign) => {
    safeRouter.push({
      pathname: '/marketing/campaign-details',
      params: {
        campaignId: campaign.id,
        campaignData: JSON.stringify(campaign)
      }
    });
  };

  const handleAddCampaign = () => {
    safeRouter.push('/marketing/add-campaign');
  };

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
        return <TrendingUp size={16} color={Colors.success} />;
      case 'completed':
        return <CheckCircle size={16} color={Colors.primary} />;
      case 'pending':
        return <Clock size={16} color={Colors.warning} />;
      case 'cancelled':
        return <XCircle size={16} color={Colors.error} />;
      default:
        return <Clock size={16} color={Colors.textLight} />;
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

  const renderCampaignCard = (campaign: MarketingCampaign) => (
    <TouchableOpacity
      key={campaign.id}
      style={styles.campaignCard}
      onPress={() => handleCampaignPress(campaign)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
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

      <View style={styles.cardContent}>
        <View style={styles.dateRow}>
          <Calendar size={16} color={Colors.textLight} />
          <Text style={styles.dateText}>
            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
          </Text>
        </View>

        <View style={styles.budgetRow}>
          <IndianRupee size={16} color={Colors.textLight} />
          <Text style={styles.budgetText}>
            Budget: {formatAmount(campaign.budget)}
          </Text>
        </View>

        <View style={styles.audienceRow}>
          <Users size={16} color={Colors.textLight} />
          <Text style={styles.audienceText} numberOfLines={1}>
            {campaign.targetAudience.join(', ')}
          </Text>
        </View>

        <View style={styles.objectiveRow}>
          <Target size={16} color={Colors.textLight} />
          <Text style={styles.objectiveText} numberOfLines={2}>
            {campaign.objective}
          </Text>
        </View>
      </View>

      {campaign.status === 'active' || campaign.status === 'completed' ? (
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{campaign.impressions.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Impressions</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{campaign.clicks.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Clicks</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{campaign.conversions.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Conversions</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatAmount(campaign.spend)}</Text>
            <Text style={styles.metricLabel}>Spent</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Marketing Campaigns</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'pending', label: 'Pending' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab,
              ]}
              onPress={() => handleFilterChange(filter.key as typeof selectedFilter)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.activeFilterTabText,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Campaigns List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredCampaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Campaigns Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No campaigns match your search criteria' : 'Create your first marketing campaign to get started'}
            </Text>
          </View>
        ) : (
          filteredCampaigns.map(renderCampaignCard)
        )}
      </ScrollView>

      {/* Add Campaign FAB */}
      <TouchableOpacity
        style={styles.addCampaignFAB}
        onPress={handleAddCampaign}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addCampaignText}>New Campaign</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search campaigns..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Advanced filter')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterTabText: {
    color: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  campaignCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  platformBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.background,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audienceText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  objectiveText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  addCampaignFAB: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addCampaignText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingSearchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
}); 