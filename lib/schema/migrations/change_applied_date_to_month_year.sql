-- Migration: Change applied_date to applied_month_year in bill_payments table
-- This allows tracking payment application by month/year instead of specific date

-- Drop the old applied_date column
ALTER TABLE bill_payments DROP COLUMN IF EXISTS applied_date;

-- Add new applied_month_year column (format: YYYY-MM, e.g., "2026-02")
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS applied_month_year TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bill_payments_applied_month_year 
  ON bill_payments(applied_month_year);

-- Add check constraint to ensure proper format (YYYY-MM)
ALTER TABLE bill_payments ADD CONSTRAINT check_applied_month_year_format 
  CHECK (applied_month_year IS NULL OR applied_month_year ~ '^\d{4}-\d{2}$');
