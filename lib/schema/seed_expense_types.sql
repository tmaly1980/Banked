-- Seed Common Expense Types
-- This script creates commonly used expense types that are shared across all users
-- Run this once to populate the expense_types table with common categories

INSERT INTO expense_types (name, "order") VALUES
  ('Groceries', 1),
  ('Gas', 2),
  ('Dining Out', 3),
  ('Entertainment', 4),
  ('Clothing', 5),
  ('Car Repairs', 6),
  ('Healthcare', 7),
  ('Personal Care', 8),
  ('Pet Care', 9),
  ('Home Maintenance', 10),
  ('Transportation', 11),
  ('Coffee/Snacks', 12),
  ('Subscriptions', 13),
  ('Gifts', 14),
  ('Hobbies', 15),
  ('Sports/Fitness', 16),
  ('Travel', 17),
  ('Education', 18),
  ('Household Supplies', 19),
  ('Miscellaneous', 20)
ON CONFLICT (name) DO NOTHING;
