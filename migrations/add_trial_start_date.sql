-- Add trial_start_date column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_businesses_trial_start_date ON public.businesses(trial_start_date) WHERE trial_start_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.businesses.trial_start_date IS 'Trial start date (denormalized for quick access)';

-- Update the trigger function to also update trial_start_date
CREATE OR REPLACE FUNCTION update_business_subscription_status()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update businesses table with subscription status
  UPDATE public.businesses
  SET 
    current_subscription_id = NEW.id,
    subscription_status = NEW.status,
    trial_start_date = NEW.trial_start_date,
    trial_end_date = NEW.trial_end_date,
    subscription_expires_at = NEW.current_period_end,
    updated_at = now()
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

















