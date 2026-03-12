-- Fix off-by-one: complete-onboarding sets last_invoice_number = starting_invoice_number
-- but it should be starting_invoice_number - 1, so first invoice gets the correct starting number.
-- This migration fixes businesses that have no invoices yet.

UPDATE business_settings bs
SET last_invoice_number = GREATEST(starting_invoice_number - 1, 0)
WHERE last_invoice_number = starting_invoice_number
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.business_id = bs.business_id
  );

-- Also fix the complete-onboarding edge function to use:
--   last_invoice_number = starting_invoice_number - 1
-- instead of:
--   last_invoice_number = starting_invoice_number
