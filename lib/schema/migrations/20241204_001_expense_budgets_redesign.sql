-- Migration: Expense Budgets Redesign
-- Date: 2024-12-04
-- Description: Redesign expense_budgets table to support multiple frequencies and date ranges

-- Step 1: Add new columns to expense_budgets table
ALTER TABLE expense_budgets
ADD COLUMN effective_from DATE,
ADD COLUMN effective_to DATE,
ADD COLUMN start_mmdd TEXT,
ADD COLUMN end_mmdd TEXT,
ADD COLUMN frequency TEXT,
ADD COLUMN notes TEXT;

-- Step 2: Migrate existing data
-- Convert start_date to effective_from and set default frequency to 'weekly'
UPDATE expense_budgets
SET 
  effective_from = start_date,
  effective_to = end_date,
  frequency = 'weekly'
WHERE effective_from IS NULL;

-- Step 3: Make effective_from and frequency NOT NULL after data migration
ALTER TABLE expense_budgets
ALTER COLUMN effective_from SET NOT NULL,
ALTER COLUMN frequency SET NOT NULL;

-- Step 4: Add CHECK constraint for frequency
ALTER TABLE expense_budgets
ADD CONSTRAINT expense_budgets_frequency_check 
CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly'));

-- Step 5: Drop old columns
ALTER TABLE expense_budgets
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS allocated_amount,
DROP COLUMN IF EXISTS spent_amount;

-- Step 6: Update indexes
DROP INDEX IF EXISTS idx_expense_budgets_start_date;
DROP INDEX IF EXISTS idx_expense_budgets_user_date;

CREATE INDEX IF NOT EXISTS idx_expense_budgets_effective_from 
ON expense_budgets(user_id, effective_from);

CREATE INDEX IF NOT EXISTS idx_expense_budgets_frequency 
ON expense_budgets(frequency);

-- Step 7: Update UNIQUE constraint
ALTER TABLE expense_budgets
DROP CONSTRAINT IF EXISTS expense_budgets_user_expense_date_unique;

ALTER TABLE expense_budgets
ADD CONSTRAINT expense_budgets_user_expense_date_unique 
UNIQUE (user_id, expense_type_id, effective_from);

-- Migration complete
-- Note: Run this migration in a transaction and test thoroughly before applying to production
