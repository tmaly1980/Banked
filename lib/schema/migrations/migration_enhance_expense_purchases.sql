-- Migration: Update expense_purchases table for enhanced purchase tracking
-- This migration adds support for purchase planning, checklists, and photos

-- Add new columns
ALTER TABLE expense_purchases 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC,
ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC,
ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data
-- Copy amount to purchase_amount for completed purchases (those with dates)
UPDATE expense_purchases 
SET purchase_amount = amount,
    purchase_date = (date::text || ' 00:00:00')::timestamp with time zone
WHERE amount IS NOT NULL AND date IS NOT NULL;

-- Make old amount and date columns nullable
ALTER TABLE expense_purchases 
ALTER COLUMN amount DROP NOT NULL,
ALTER COLUMN date DROP NOT NULL;

-- Rename old columns for backward compatibility during transition
ALTER TABLE expense_purchases 
RENAME COLUMN amount TO amount_deprecated;

ALTER TABLE expense_purchases 
RENAME COLUMN date TO date_deprecated;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_expense_purchases_purchase_date ON expense_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_expense_purchases_title ON expense_purchases(title);

-- Update the table comment
COMMENT ON TABLE expense_purchases IS 'Tracks both planned and completed purchases with checklist support';
COMMENT ON COLUMN expense_purchases.title IS 'Title/name of the purchase';
COMMENT ON COLUMN expense_purchases.estimated_amount IS 'Estimated cost before purchase';
COMMENT ON COLUMN expense_purchases.purchase_amount IS 'Actual purchase amount';
COMMENT ON COLUMN expense_purchases.purchase_date IS 'When the purchase was completed';
COMMENT ON COLUMN expense_purchases.checklist IS 'JSON array of checklist items with name, checked, and price fields';
COMMENT ON COLUMN expense_purchases.photos IS 'Array of photo URLs/paths';
