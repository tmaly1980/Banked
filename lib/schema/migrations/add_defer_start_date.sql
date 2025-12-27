-- Add defer_start_date column to bills table
-- This allows bills to be marked as deferred starting from a specific date
-- Bills are only excluded from calculations if current date is on or after defer_start_date

ALTER TABLE bills
ADD COLUMN IF NOT EXISTS defer_start_date DATE;

-- Add index for better query performance on active deferred bills
CREATE INDEX IF NOT EXISTS idx_bills_defer_start_date 
ON bills(defer_start_date) 
WHERE deferred_flag = TRUE AND defer_start_date IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN bills.defer_start_date IS 'Date when deferral becomes active - bill excluded from calculations only on or after this date';
