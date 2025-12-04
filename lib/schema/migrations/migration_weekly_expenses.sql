-- Migration: Add spent_amount and rename amount to allocated_amount in weekly_expenses
-- Run this in your Supabase SQL editor

-- Step 1: Add spent_amount column
ALTER TABLE weekly_expenses 
ADD COLUMN IF NOT EXISTS spent_amount NUMERIC DEFAULT 0 NOT NULL;

-- Step 2: Rename amount to allocated_amount
ALTER TABLE weekly_expenses 
RENAME COLUMN amount TO allocated_amount;

-- Step 3: Update the constraint if needed
-- (No constraints to update in this case)
