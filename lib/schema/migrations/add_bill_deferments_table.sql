-- Create bill_deferments table for tracking which months bills are deferred
-- Replaces defer_start_date and deferred_note columns

-- First, drop the view that depends on these columns
DROP VIEW IF EXISTS user_bills_view;

CREATE TABLE IF NOT EXISTS bill_deferments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bill_id, month_year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_deferments_bill_id ON bill_deferments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_deferments_user_id ON bill_deferments(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_deferments_month_year ON bill_deferments(month_year);

-- Enable RLS
ALTER TABLE bill_deferments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bill deferments"
  ON bill_deferments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bill deferments"
  ON bill_deferments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill deferments"
  ON bill_deferments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill deferments"
  ON bill_deferments FOR DELETE
  USING (auth.uid() = user_id);

-- Remove old columns from bills table
ALTER TABLE bills DROP COLUMN IF EXISTS defer_start_date;
ALTER TABLE bills DROP COLUMN IF EXISTS deferred_note;

-- Add comments
COMMENT ON TABLE bill_deferments IS 'Tracks which months a bill is deferred';
COMMENT ON COLUMN bill_deferments.month_year IS 'Month and year in YYYY-MM format when bill is deferred';
COMMENT ON COLUMN bill_deferments.reason IS 'Reason for deferring the bill in this month';

-- Note: After running this migration, you must recreate the user_bills_view
-- Run the updated get_user_bills_v2.sql to recreate the view with the new structure
