-- Drop deferred_flag column from bills table
-- This flag was replaced by month-specific deferments in bill_deferments table

-- First drop the view that depends on this column
DROP VIEW IF EXISTS user_bills_view CASCADE;

-- Drop the column
ALTER TABLE bills DROP COLUMN IF EXISTS deferred_flag;

-- Recreate the view (run get_user_bills_v2.sql after this migration)
