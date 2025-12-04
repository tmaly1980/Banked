-- Seed Common Expense Types
-- This script creates commonly used expense types that are shared across all users
-- Run this once to populate the expense_types table with common categories

INSERT INTO expense_types (name) VALUES
  ('Groceries'),
  ('Shopping'),
  ('Gas'),
  ('Transportation'),
  ('Dining Out'),
  ('Coffee/Snacks'),
  ('Entertainment'),
  ('Subscriptions'),
  ('Clothing'),
  ('Healthcare'),
  ('Personal Care'),
  ('Pet Care'),
  ('Home Maintenance'),
  ('Household Supplies'),
  ('Car Repairs'),
  ('Gifts'),
  ('Hobbies'),
  ('Sports/Fitness'),
  ('Travel'),
  ('Education'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;
