import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CalendarDays, X, Check, CircleX } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { getLeaveRequests, updateLeaveRequest, createInAppNotification } from '@/services/backendApi';
import { usePermissions } from '@/contexts/PermissionContext';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: { 50: '#F9FAFB', 200: '#E5E7EB' },
};

const formatLeaveDate = (d: string) => {
  try {
    const [y, m, day] = d.split(/[-/]/);
    if (y && m && day) return `${day}-${m}-${y}`;
    return d;
  } catch {
    return d;
  }
};

const getLeaveStatusColor = (status: string) => {
  if (status === 'approved') return Colors.success;
  if (status === 'rejected') return Colors.error;
  if (status === 'withdrawn') return Colors.textLight;
  return Colors.warning;
};

export default function LeaveLogScreen() {
  const { isOwner } = usePermissions();
  const { data: businessData } = useBusinessData();
  const [allLeaveRequests, setAllLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadLeaves = useCallback(async () => {
    const res = await getLeaveRequests();
    if (res.success) setAllLeaveRequests(res.leaveRequests || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLeaves();
      setLoading(false);
    })();
  }, [loadLeaves]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaves();
    setRefreshing(false);
  }, [loadLeaves]);

  const filtered = search.trim()
    ? allLeaveRequests.filter((lr) => (lr.staff_name || '').toLowerCase().includes(search.trim().toLowerCase()))
    : allLeaveRequests;

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewModal) return;
    setReviewSubmitting(true);
    const res = await updateLeaveRequest(reviewModal.id, {
      status,
      reviewerNote: reviewNote.trim() || undefined,
    });
    setReviewSubmitting(false);
    if (res.success) {
      Alert.alert(status === 'approved' ? 'Leave Approved' : 'Leave Rejected', `The leave request from ${reviewModal.staff_name} has been ${status}.`);
      setReviewModal(null);
      setReviewNote('');
      loadLeaves();
    } else {
      Alert.alert('Error', res.error || 'Failed to update leave request.');
    }
  };

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Log</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: Colors.textLight, textAlign: 'center' }}>Only business owners can view the leave log.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Log</Text>
      </View>

      <TextInput
        placeholder="Search by staff name..."
        placeholderTextColor={Colors.textLight}
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <CalendarDays size={48} color={Colors.grey[200]} />
              <Text style={{ fontSize: 16, color: Colors.textLight, marginTop: 12, textAlign: 'center' }}>
                {allLeaveRequests.length === 0 ? 'No leave requests yet' : 'No matching leave requests'}
              </Text>
            </View>
          ) : (
            filtered.slice(0, 100).map((lr) => (
              <Pressable key={lr.id} onPress={() => setDetailModal(lr)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <View style={[styles.card, { borderLeftColor: getLeaveStatusColor(lr.status) }]}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardName}>{lr.staff_name}</Text>
                    <View style={[styles.badge, { backgroundColor: getLeaveStatusColor(lr.status) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getLeaveStatusColor(lr.status) }]}>{lr.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDates}>
                    {formatLeaveDate(lr.start_date)} — {formatLeaveDate(lr.end_date)}
                  </Text>
                  <Text style={styles.cardReason} numberOfLines={2}>{lr.reason}</Text>
                  {lr.status === 'pending' && (
                    <Pressable
                      onPress={() => { setReviewModal(lr); setReviewNote(''); }}
                      style={({ pressed }) => [styles.reviewBtn, { opacity: pressed ? 0.9 : 1 }]}
                    >
                      <Text style={styles.reviewBtnText}>Review request</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal visible={!!detailModal} transparent animationType="fade" onRequestClose={() => setDetailModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave details</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}><X size={22} color={Colors.textLight} /></TouchableOpacity>
            </View>
            {detailModal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailName}>{detailModal.staff_name}</Text>
                <View style={[styles.badge, { alignSelf: 'flex-start', marginBottom: 12, backgroundColor: getLeaveStatusColor(detailModal.status) + '18' }]}>
                  <Text style={[styles.badgeText, { color: getLeaveStatusColor(detailModal.status) }]}>{detailModal.status}</Text>
                </View>
                <Text style={styles.detailDates}>{formatLeaveDate(detailModal.start_date)} — {formatLeaveDate(detailModal.end_date)}</Text>
                <Text style={styles.detailLabel}>Message / Reason</Text>
                <Text style={styles.detailValue}>{detailModal.reason || '—'}</Text>
                {detailModal.reviewer_note && (
                  <>
                    <Text style={styles.detailLabel}>Approval / Rejection note</Text>
                    <Text style={[styles.detailValue, { fontStyle: 'italic', color: Colors.primary }]}>{detailModal.reviewer_note}</Text>
                  </>
                )}
                {detailModal.reviewed_at && (
                  <Text style={styles.detailSmall}>
                    Reviewed: {new Date(detailModal.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                {detailModal.status === 'pending' && (
                  <Pressable onPress={() => { setDetailModal(null); setReviewModal(detailModal); setReviewNote(''); }} style={styles.reviewBtn}>
                    <Text style={styles.reviewBtnText}>Review request</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={!!reviewModal} transparent animationType="fade" onRequestClose={() => setReviewModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review leave request</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}><X size={22} color={Colors.textLight} /></TouchableOpacity>
            </View>
            {reviewModal && (
              <>
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={styles.detailName}>{reviewModal.staff_name}</Text>
                  <Text style={styles.detailDates}>{formatLeaveDate(reviewModal.start_date)} — {formatLeaveDate(reviewModal.end_date)}</Text>
                  <Text style={styles.detailValue}>{reviewModal.reason}</Text>
                </View>
                <Text style={styles.detailLabel}>Note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  placeholder="Add a note for the staff member"
                  placeholderTextColor={Colors.textLight}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <Pressable
                    onPress={() => handleReview('rejected')}
                    disabled={reviewSubmitting}
                    style={[styles.actionBtn, { flex: 1, backgroundColor: reviewSubmitting ? Colors.grey[200] : Colors.error }]}
                  >
                    <CircleX size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReview('approved')}
                    disabled={reviewSubmitting}
                    style={[styles.actionBtn, { flex: 1, backgroundColor: reviewSubmitting ? Colors.grey[200] : Colors.success }]}
                  >
                    <Check size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  searchInput: {
    borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.grey[50], borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardDates: { fontSize: 13, color: Colors.text, marginBottom: 2 },
  cardReason: { fontSize: 12, color: Colors.textLight },
  reviewBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.primary },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  detailName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  detailDates: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 12, marginBottom: 4 },
  detailValue: { fontSize: 14, color: Colors.textLight, marginBottom: 8 },
  detailSmall: { fontSize: 12, color: Colors.textLight },
  noteInput: { borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, padding: 12, fontSize: 15, color: Colors.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14 },
});
