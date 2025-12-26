-- Remove frequency and pending_earnings columns from income_sources table
-- These are now handled by income_rules table

ALTER TABLE income_sources
DROP COLUMN IF EXISTS frequency;

ALTER TABLE income_sources
DROP COLUMN IF EXISTS pending_earnings;

-- Drop the frequency index if it exists
DROP INDEX IF EXISTS idx_income_sources_frequency;
