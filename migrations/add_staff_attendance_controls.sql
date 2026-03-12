-- Staff attendance controls: attendance mode and configurable geofence radius
-- Run this via the Supabase Dashboard SQL editor.

-- 1. Attendance mode: 'geofence' (continuous location tracking) or 'manual' (one-time check-in)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS attendance_mode text DEFAULT 'geofence'
  CHECK (attendance_mode IN ('geofence', 'manual'));

-- 2. Geofence radius in meters (used when attendance_mode = 'geofence')
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS geofence_radius integer DEFAULT 100;

COMMENT ON COLUMN public.staff.attendance_mode IS 'How attendance is tracked: geofence (auto-checkout on exit) or manual (one-time check-in)';
COMMENT ON COLUMN public.staff.geofence_radius IS 'Geofence radius in meters for auto-checkout (default 100m)';
