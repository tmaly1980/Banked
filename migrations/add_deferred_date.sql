-- Rename applied_date to payment_date and remove deferred_date
-- This simplifies the payment system to use a single payment_date field

-- Rename applied_date to payment_date
ALTER TABLE bill_payments 
RENAME COLUMN applied_date TO payment_date;

-- Drop deferred_date column if it exists
ALTER TABLE bill_payments 
DROP COLUMN IF EXISTS deferred_date;

-- Update index for better query performance on scheduled payments
DROP INDEX IF EXISTS idx_bill_payments_deferred_date;
CREATE INDEX IF NOT EXISTS idx_bill_payments_payment_date 
ON bill_payments(payment_date);

-- Add comment to document the purpose
COMMENT ON COLUMN bill_payments.payment_date IS 'Date when payment is/will be applied - can be past, present, or future (scheduled)';
