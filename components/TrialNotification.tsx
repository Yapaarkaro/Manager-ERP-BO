import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { CheckCircle, Crown, Calendar, X } from 'lucide-react-native';

interface TrialNotificationProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  trialEndDate: string;
  loading?: boolean;
}

const SkeletonBar = ({ width, height = 14, style }: { width: number | string; height?: number; style?: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: height / 2, backgroundColor: '#e2e8f0', opacity: pulseAnim },
        style,
      ]}
    />
  );
};

const TrialNotification: React.FC<TrialNotificationProps> = ({
  visible,
  onClose,
  onUpgrade,
  trialEndDate,
  loading = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const formatTrialEndDate = (dateString: string) => {
    if (!dateString) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={loading ? undefined : onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={loading ? undefined : onClose}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            {!loading && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            )}

            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Crown size={48} color="#3f66ac" strokeWidth={2} />
              </View>
            </View>

            {loading ? (
              <View style={styles.content}>
                <Text style={styles.title}>Setting up your business...</Text>
                <Text style={styles.subtitle}>
                  This will only take a moment
                </Text>

                <View style={styles.trialInfo}>
                  <View style={styles.trialInfoItem}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#d1fae5' }} />
                    <SkeletonBar width="70%" style={{ marginLeft: 12 }} />
                  </View>
                  <View style={styles.trialInfoItem}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#d1fae5' }} />
                    <SkeletonBar width="60%" style={{ marginLeft: 12 }} />
                  </View>
                  <View style={styles.trialInfoItem}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#d1fae5' }} />
                    <SkeletonBar width="65%" style={{ marginLeft: 12 }} />
                  </View>
                </View>

                <View style={styles.trialEndContainer}>
                  <SkeletonBar width="80%" height={16} />
                </View>

                <View style={styles.buttonContainer}>
                  <View style={[styles.upgradeButton, { opacity: 0.5 }]}>
                    <SkeletonBar width={160} height={16} />
                  </View>
                  <View style={[styles.laterButton, { opacity: 0.5 }]}>
                    <SkeletonBar width={130} height={16} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.content}>
                <Text style={styles.title}>🎉 Welcome to Manager ERP!</Text>
                <Text style={styles.subtitle}>
                  Your 30-day free trial has started
                </Text>

                <View style={styles.trialInfo}>
                  <View style={styles.trialInfoItem}>
                    <CheckCircle size={20} color="#10b981" />
                    <Text style={styles.trialInfoText}>
                      Full access to all features
                    </Text>
                  </View>
                  <View style={styles.trialInfoItem}>
                    <CheckCircle size={20} color="#10b981" />
                    <Text style={styles.trialInfoText}>
                      Primary location management
                    </Text>
                  </View>
                  <View style={styles.trialInfoItem}>
                    <CheckCircle size={20} color="#10b981" />
                    <Text style={styles.trialInfoText}>
                      Invoice generation & reporting
                    </Text>
                  </View>
                </View>

                <View style={styles.trialEndContainer}>
                  <Calendar size={20} color="#3f66ac" />
                  <Text style={styles.trialEndText}>
                    Free trial ends on {formatTrialEndDate(trialEndDate)}
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={onUpgrade}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upgradeButtonText}>
                      View Subscription Plans
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.laterButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.laterButtonText}>
                      Continue with Trial
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export default React.memo(TrialNotification);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: Platform.select({
      web: 24,
      default: 20, // Add side padding so it feels like a popup, not a new screen
    }),
    maxWidth: 400,
    width: Platform.select({
      web: '100%',
      default: '90%', // Ensure it doesn't span full width on mobile
    }),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f4ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3f66ac',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  trialInfo: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  trialInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialInfoText: {
    fontSize: 14,
    color: '#047857',
    marginLeft: 12,
    fontWeight: '500',
  },
  trialEndContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  trialEndText: {
    fontSize: 14,
    color: '#3f66ac',
    marginLeft: 8,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  laterButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});

