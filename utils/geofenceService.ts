import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const BACKGROUND_LOCATION_TASK = 'staff-geofence-monitor';
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
const OUTSIDE_GRACE_PERIOD_MS = 60_000;
const STORAGE_KEY = '@geofence_state';

let outsideSinceTimestamp: number | null = null;
let targetCoords: { lat: number; lng: number } | null = null;
let activeStaffId: string | null = null;
let activeSessionId: string | null = null;
let activeGeofenceRadius: number = DEFAULT_GEOFENCE_RADIUS_METERS;

async function persistState() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeStaffId,
      activeSessionId,
      targetCoords,
      activeGeofenceRadius,
    }));
  } catch {}
}

async function recoverState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!activeStaffId && state.activeStaffId) activeStaffId = state.activeStaffId;
    if (!activeSessionId && state.activeSessionId) activeSessionId = state.activeSessionId;
    if (!targetCoords && state.targetCoords) targetCoords = state.targetCoords;
    if (state.activeGeofenceRadius) activeGeofenceRadius = state.activeGeofenceRadius;
  } catch {}
}

async function clearPersistedState() {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
}

export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(
  staffLat: number, staffLng: number,
  targetLat: number, targetLng: number,
  radiusMeters: number = GEOFENCE_RADIUS_METERS,
): boolean {
  return calculateDistance(staffLat, staffLng, targetLat, targetLng) <= radiusMeters;
}

export async function getStaffAssignedCoordinates(
  locationId: string | null,
): Promise<{ lat: number; lng: number } | null> {
  if (!locationId) return null;

  try {
    const { data } = await supabase
      .from('locations')
      .select('latitude, longitude')
      .eq('id', locationId)
      .single();

    if (data?.latitude != null && data?.longitude != null) {
      return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
    }
  } catch (e) {
    console.warn('Failed to fetch location coordinates:', e);
  }
  return null;
}

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  const foreground = fgStatus === 'granted';

  let background = false;
  if (foreground && Platform.OS !== 'web') {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    background = bgStatus === 'granted';
  }

  return { foreground, background };
}

export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  } catch (e) {
    console.warn('Failed to get current position:', e);
    return null;
  }
}

async function handleAutoOffline(distance: number) {
  await recoverState();
  if (!activeStaffId || !activeSessionId) return;

  try {
    const now = new Date().toISOString();

    await supabase
      .from('staff_sessions')
      .update({
        check_out: now,
        check_out_reason: 'geofence_exit',
        distance_at_checkout: Math.round(distance),
      })
      .eq('id', activeSessionId);

    await supabase
      .from('staff')
      .update({ is_online: false })
      .eq('id', activeStaffId);

    const today = now.split('T')[0];
    await supabase
      .from('staff_attendance')
      .update({ check_out: now, updated_at: now })
      .eq('staff_id', activeStaffId)
      .eq('date', today);

    // Send local notification
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Marked Offline',
          body: `You moved ${Math.round(distance)}m from your work location and have been marked offline.`,
          sound: true,
        },
        trigger: null,
      });
    } catch {}
  } catch (e) {
    console.error('Auto-offline update failed:', e);
  }

  await stopBackgroundLocationMonitoring();
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      const msg = error?.message || '';
      // Suppress transient iOS GPS errors (kCLErrorDomain Code=0)
      if (msg.includes('kCLErrorDomain') || msg.includes('Code=0') || error?.code === 0) {
        return;
      }
      console.warn('Background location error:', error);
      return;
    }

    // Recover state from AsyncStorage if in-memory state is gone
    if (!targetCoords || !activeStaffId || !activeSessionId) {
      await recoverState();
    }

    if (!data?.locations?.length || !targetCoords) return;

    const { latitude, longitude } = data.locations[0].coords;
    const distance = calculateDistance(latitude, longitude, targetCoords.lat, targetCoords.lng);

    if (distance > activeGeofenceRadius) {
      if (!outsideSinceTimestamp) {
        outsideSinceTimestamp = Date.now();
      } else if (Date.now() - outsideSinceTimestamp >= OUTSIDE_GRACE_PERIOD_MS) {
        await handleAutoOffline(distance);
        outsideSinceTimestamp = null;
      }
    } else {
      outsideSinceTimestamp = null;
    }
  });
}

export async function startBackgroundLocationMonitoring(
  staffId: string,
  sessionId: string,
  tgtLat: number,
  tgtLng: number,
  radiusMeters?: number,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  activeStaffId = staffId;
  activeSessionId = sessionId;
  targetCoords = { lat: tgtLat, lng: tgtLng };
  activeGeofenceRadius = radiusMeters || DEFAULT_GEOFENCE_RADIUS_METERS;
  outsideSinceTimestamp = null;

  await persistState();

  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 20,
      deferredUpdatesInterval: 30_000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Attendance Active',
        notificationBody: 'Your location is being monitored for attendance.',
        notificationColor: '#3f66ac',
      },
    });
    return true;
  } catch (e) {
    console.error('Failed to start background location:', e);
    return false;
  }
}

export async function stopBackgroundLocationMonitoring(): Promise<void> {
  activeStaffId = null;
  activeSessionId = null;
  targetCoords = null;
  outsideSinceTimestamp = null;

  await clearPersistedState();

  if (Platform.OS === 'web') return;

  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.warn('Failed to stop background location:', e);
  }
}

export function setActiveSession(staffId: string, sessionId: string) {
  activeStaffId = staffId;
  activeSessionId = sessionId;
  persistState();
}

export async function getStaffAttendanceConfig(
  staffId: string,
): Promise<{ attendanceMode: 'geofence' | 'manual'; geofenceRadius: number }> {
  try {
    const { data } = await supabase
      .from('staff')
      .select('attendance_mode, geofence_radius')
      .eq('id', staffId)
      .maybeSingle();

    return {
      attendanceMode: data?.attendance_mode || 'geofence',
      geofenceRadius: data?.geofence_radius || DEFAULT_GEOFENCE_RADIUS_METERS,
    };
  } catch {
    return { attendanceMode: 'geofence', geofenceRadius: DEFAULT_GEOFENCE_RADIUS_METERS };
  }
}
