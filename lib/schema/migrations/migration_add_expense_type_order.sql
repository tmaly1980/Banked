-- Migration: Add order field to expense_types
-- This migration adds an order field to control the display order of expense types

-- Create sequence for auto-incrementing order
CREATE SEQUENCE IF NOT EXISTS expense_types_order_seq START 1;

-- Add order column with default using sequence
ALTER TABLE expense_types 
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT nextval('expense_types_order_seq');

-- Update existing expense types with specific order
UPDATE expense_types SET "order" = 1 WHERE name = 'Groceries';
UPDATE expense_types SET "order" = 2 WHERE name = 'Gas';
UPDATE expense_types SET "order" = 3 WHERE name = 'Dining Out';
UPDATE expense_types SET "order" = 4 WHERE name = 'Entertainment';
UPDATE expense_types SET "order" = 5 WHERE name = 'Clothing';
UPDATE expense_types SET "order" = 6 WHERE name = 'Car Repairs';
UPDATE expense_types SET "order" = 7 WHERE name = 'Healthcare';
UPDATE expense_types SET "order" = 8 WHERE name = 'Personal Care';
UPDATE expense_types SET "order" = 9 WHERE name = 'Pet Care';
UPDATE expense_types SET "order" = 10 WHERE name = 'Home Maintenance';
UPDATE expense_types SET "order" = 11 WHERE name = 'Transportation';
UPDATE expense_types SET "order" = 12 WHERE name = 'Coffee/Snacks';
UPDATE expense_types SET "order" = 13 WHERE name = 'Subscriptions';
UPDATE expense_types SET "order" = 14 WHERE name = 'Gifts';
UPDATE expense_types SET "order" = 15 WHERE name = 'Hobbies';
UPDATE expense_types SET "order" = 16 WHERE name = 'Sports/Fitness';
UPDATE expense_types SET "order" = 17 WHERE name = 'Travel';
UPDATE expense_types SET "order" = 18 WHERE name = 'Education';
UPDATE expense_types SET "order" = 19 WHERE name = 'Household Supplies';
UPDATE expense_types SET "order" = 20 WHERE name = 'Miscellaneous';

-- Set sequence to continue from the highest order value
SELECT setval('expense_types_order_seq', (SELECT COALESCE(MAX("order"), 0) + 1 FROM expense_types), false);

-- Create index for order field to improve query performance
CREATE INDEX IF NOT EXISTS idx_expense_types_order ON expense_types("order");
