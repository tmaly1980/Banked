-- Migration: Simplify expense_budgets table
-- Removes spent_amount and renames allocated_amount to amount

-- Step 1: Drop spent_amount column
ALTER TABLE expense_budgets DROP COLUMN IF EXISTS spent_amount;

-- Step 2: Rename allocated_amount to amount
ALTER TABLE expense_budgets RENAME COLUMN allocated_amount TO amount;
