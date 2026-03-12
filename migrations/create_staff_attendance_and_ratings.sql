-- Staff Attendance: daily check-in/check-out records
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'on_leave', 'holiday')),
  notes text,
  location_id uuid REFERENCES public.locations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, date)
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_attendance_business_access" ON public.staff_attendance
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_staff_attendance_staff_date ON public.staff_attendance(staff_id, date DESC);
CREATE INDEX idx_staff_attendance_business ON public.staff_attendance(business_id, date DESC);

-- Staff Ratings: customer/manager ratings for staff
CREATE TABLE IF NOT EXISTS public.staff_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  rated_by text NOT NULL DEFAULT 'customer' CHECK (rated_by IN ('customer', 'manager', 'system')),
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  invoice_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_ratings_business_access" ON public.staff_ratings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_staff_ratings_staff ON public.staff_ratings(staff_id, created_at DESC);

COMMENT ON TABLE public.staff_attendance IS 'Tracks daily staff attendance with check-in/check-out times';
COMMENT ON TABLE public.staff_ratings IS 'Stores customer and manager ratings for staff members';
