-- Update bill_deferments table to add decide_by_date and is_active flag
-- Keeps month_year to track when deferment period started
-- decide_by_date is when user needs to make a decision (reminder date)

-- Drop old column if it exists (from previous migration attempt)
ALTER TABLE bill_deferments DROP COLUMN IF EXISTS deferred_until_date;

-- Add month_year column if it doesn't exist (for new setups)
ALTER TABLE bill_deferments 
  ADD COLUMN IF NOT EXISTS month_year TEXT;

-- Add new columns
ALTER TABLE bill_deferments 
  ADD COLUMN IF NOT EXISTS decide_by_date DATE,
  ADD COLUMN IF NOT EXISTS loss_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing data: set decide_by_date to last day of deferred month (if month_year exists)
UPDATE bill_deferments
SET decide_by_date = (month_year || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day',
    is_active = true
WHERE decide_by_date IS NULL AND month_year IS NOT NULL AND month_year != '';

-- For rows without month_year, set decide_by_date to 30 days from now as default
UPDATE bill_deferments
SET decide_by_date = CURRENT_DATE + INTERVAL '30 days',
    is_active = true
WHERE decide_by_date IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bill_deferments_month_year ON bill_deferments(month_year);
CREATE INDEX IF NOT EXISTS idx_bill_deferments_decide_by_date ON bill_deferments(decide_by_date);
CREATE INDEX IF NOT EXISTS idx_bill_deferments_is_active ON bill_deferments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bill_deferments_loss_date ON bill_deferments(loss_date);

-- Update comments
COMMENT ON COLUMN bill_deferments.month_year IS 'Month-year when deferment started (YYYY-MM format)';
COMMENT ON COLUMN bill_deferments.decide_by_date IS 'Date by which user needs to make a decision on the bill';
COMMENT ON COLUMN bill_deferments.loss_date IS 'Optional date when financial loss/penalty occurs if not paid';
COMMENT ON COLUMN bill_deferments.is_active IS 'Whether this deferment is currently active';

