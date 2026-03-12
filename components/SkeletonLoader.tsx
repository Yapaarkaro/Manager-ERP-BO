import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonInner({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

export const Skeleton = React.memo(SkeletonInner);

function SkeletonCircleInner({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

export const SkeletonCircle = React.memo(SkeletonCircleInner);

// Dashboard skeleton
function DashboardSkeletonInner() {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={skeletonStyles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={120} height={24} style={{ marginLeft: 12 }} />
      </View>

      {/* Summary Cards */}
      <View style={skeletonStyles.cardsRow}>
        <View style={skeletonStyles.summaryCard}>
          <Skeleton width={60} height={14} />
          <Skeleton width={100} height={28} style={{ marginTop: 8 }} />
          <Skeleton width={50} height={12} style={{ marginTop: 6 }} />
        </View>
        <View style={skeletonStyles.summaryCard}>
          <Skeleton width={60} height={14} />
          <Skeleton width={100} height={28} style={{ marginTop: 8 }} />
          <Skeleton width={50} height={12} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={skeletonStyles.section}>
        <Skeleton width={140} height={20} style={{ marginBottom: 16 }} />
        <View style={skeletonStyles.gridRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={skeletonStyles.gridItem}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <Skeleton width={50} height={12} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
        <View style={[skeletonStyles.gridRow, { marginTop: 16 }]}>
          {[5, 6, 7, 8].map(i => (
            <View key={i} style={skeletonStyles.gridItem}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <Skeleton width={50} height={12} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={skeletonStyles.section}>
        <Skeleton width={160} height={20} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map(i => (
          <View key={i} style={skeletonStyles.listItem}>
            <SkeletonCircle size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={70} height={20} />
          </View>
        ))}
      </View>
    </View>
  );
}

export const DashboardSkeleton = React.memo(DashboardSkeletonInner);

// List screen skeleton (invoices, inventory, customers, etc.)
function ListSkeletonInner({ itemCount = 6, showSearch = true, showFilter = true }) {
  return (
    <View style={skeletonStyles.container}>
      {/* Search & Filter Bar */}
      {showSearch && (
        <View style={skeletonStyles.searchBar}>
          <Skeleton width="100%" height={44} borderRadius={12} />
        </View>
      )}
      {showFilter && (
        <View style={skeletonStyles.filterRow}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width={70} height={32} borderRadius={16} style={{ marginRight: 8 }} />
          ))}
        </View>
      )}

      {/* Summary stats row */}
      <View style={skeletonStyles.statsRow}>
        <View style={skeletonStyles.statItem}>
          <Skeleton width={50} height={12} />
          <Skeleton width={70} height={22} style={{ marginTop: 4 }} />
        </View>
        <View style={skeletonStyles.statItem}>
          <Skeleton width={50} height={12} />
          <Skeleton width={70} height={22} style={{ marginTop: 4 }} />
        </View>
        <View style={skeletonStyles.statItem}>
          <Skeleton width={50} height={12} />
          <Skeleton width={70} height={22} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* List Items */}
      {Array.from({ length: itemCount }).map((_, i) => (
        <View key={i} style={skeletonStyles.listCard}>
          <View style={skeletonStyles.listCardHeader}>
            <Skeleton width={100} height={16} />
            <Skeleton width={80} height={24} borderRadius={12} />
          </View>
          <View style={skeletonStyles.listCardBody}>
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={90} height={20} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const ListSkeleton = React.memo(ListSkeletonInner);

// Detail screen skeleton (invoice details, customer details, etc.)
function DetailSkeletonInner() {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={[skeletonStyles.section, { alignItems: 'center' }]}>
        <SkeletonCircle size={64} />
        <Skeleton width={180} height={24} style={{ marginTop: 12 }} />
        <Skeleton width={120} height={14} style={{ marginTop: 8 }} />
      </View>

      {/* Info Cards */}
      <View style={skeletonStyles.section}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={skeletonStyles.detailRow}>
            <Skeleton width={100} height={14} />
            <Skeleton width={150} height={16} />
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={skeletonStyles.section}>
        <Skeleton width="100%" height={48} borderRadius={12} />
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
      </View>

      {/* Sub-items */}
      <View style={skeletonStyles.section}>
        <Skeleton width={140} height={20} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <View key={i} style={skeletonStyles.listItem}>
            <Skeleton width={40} height={40} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="30%" height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={60} height={16} />
          </View>
        ))}
      </View>
    </View>
  );
}

export const DetailSkeleton = React.memo(DetailSkeletonInner);

// Settings / Profile skeleton
function SettingsSkeletonInner() {
  return (
    <View style={skeletonStyles.container}>
      {/* Profile section */}
      <View style={[skeletonStyles.section, { alignItems: 'center', paddingVertical: 24 }]}>
        <SkeletonCircle size={80} />
        <Skeleton width={160} height={22} style={{ marginTop: 16 }} />
        <Skeleton width={200} height={14} style={{ marginTop: 8 }} />
      </View>

      {/* Settings groups */}
      {[1, 2, 3].map(group => (
        <View key={group} style={skeletonStyles.section}>
          <Skeleton width={120} height={16} style={{ marginBottom: 12 }} />
          {[1, 2, 3].map(item => (
            <View key={item} style={skeletonStyles.settingsItem}>
              <Skeleton width={24} height={24} borderRadius={6} />
              <Skeleton width="60%" height={16} style={{ marginLeft: 12 }} />
              <View style={{ flex: 1 }} />
              <Skeleton width={20} height={20} borderRadius={4} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export const SettingsSkeleton = React.memo(SettingsSkeletonInner);

// Auth flow skeleton (for screens that check user data)
function AuthCheckSkeletonInner() {
  return (
    <View style={skeletonStyles.authContainer}>
      <View style={skeletonStyles.authContent}>
        <SkeletonCircle size={100} />
        <Skeleton width={200} height={28} style={{ marginTop: 24 }} />
        <Skeleton width={260} height={16} style={{ marginTop: 12 }} />
        <Skeleton width={220} height={16} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={52} borderRadius={12} style={{ marginTop: 32 }} />
      </View>
    </View>
  );
}

export const AuthCheckSkeleton = React.memo(AuthCheckSkeletonInner);

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  section: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridItem: {
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
});
