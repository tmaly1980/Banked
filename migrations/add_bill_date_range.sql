-- Add start_month_year and end_month_year columns to bills table
-- Format: 'YYYY-MM' (e.g., '2025-01' for January 2025)

ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS start_month_year TEXT,
ADD COLUMN IF NOT EXISTS end_month_year TEXT;

-- Add check constraints to ensure valid format
ALTER TABLE bills
ADD CONSTRAINT check_start_month_year_format 
  CHECK (start_month_year IS NULL OR start_month_year ~ '^\d{4}-\d{2}$');

ALTER TABLE bills
ADD CONSTRAINT check_end_month_year_format 
  CHECK (end_month_year IS NULL OR end_month_year ~ '^\d{4}-\d{2}$');

-- Add check to ensure end_month_year is after start_month_year
ALTER TABLE bills
ADD CONSTRAINT check_end_after_start
  CHECK (
    start_month_year IS NULL OR 
    end_month_year IS NULL OR 
    end_month_year >= start_month_year
  );
