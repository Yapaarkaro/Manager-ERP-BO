-- Staff RBAC: add verification_code, user_id to staff; role to users
-- Run this via the Supabase Dashboard SQL editor.

-- 1. Staff table: verification code for first-time login
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS verification_code text;

-- 2. Staff table: link to auth user after first login
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);

-- 3. Users table: distinguish owner vs staff
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'owner';
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

COMMENT ON COLUMN public.staff.verification_code IS 'One-time code for staff first login, cleared after verification';
COMMENT ON COLUMN public.staff.user_id IS 'Links staff record to auth.users after first login';
COMMENT ON COLUMN public.users.role IS 'User role: owner or staff';
