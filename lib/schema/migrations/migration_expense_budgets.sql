-- Migration to reorganize expense system
-- Renames weekly_expenses to expense_budgets with structural changes
-- Creates new expense_purchases table

-- Step 1: Create expense_purchases table
CREATE TABLE IF NOT EXISTS expense_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  expense_type_id UUID REFERENCES expense_types ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE expense_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense purchases"
  ON expense_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense purchases"
  ON expense_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense purchases"
  ON expense_purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense purchases"
  ON expense_purchases FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_expense_purchases_user_id ON expense_purchases(user_id);
CREATE INDEX idx_expense_purchases_date ON expense_purchases(date);
CREATE INDEX idx_expense_purchases_expense_type_id ON expense_purchases(expense_type_id);

-- Step 2: Rename weekly_expenses to expense_budgets
ALTER TABLE IF EXISTS weekly_expenses RENAME TO expense_budgets;

-- Step 3: Rename week_start_date to start_date
ALTER TABLE IF EXISTS expense_budgets RENAME COLUMN week_start_date TO start_date;

-- Step 4: Add end_date column (nullable)
ALTER TABLE IF EXISTS expense_budgets ADD COLUMN IF NOT EXISTS end_date DATE;

-- Step 5: Drop notes column
ALTER TABLE IF EXISTS expense_budgets DROP COLUMN IF EXISTS notes;

-- Step 6: Update unique constraint to use new column name
ALTER TABLE IF EXISTS expense_budgets DROP CONSTRAINT IF EXISTS weekly_expenses_user_id_expense_type_id_week_start_date_key;
ALTER TABLE IF EXISTS expense_budgets ADD CONSTRAINT expense_budgets_user_id_expense_type_id_start_date_key 
  UNIQUE(user_id, expense_type_id, start_date);

-- Step 7: Create indexes for expense_budgets if they don't exist
CREATE INDEX IF NOT EXISTS idx_expense_budgets_user_id ON expense_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_start_date ON expense_budgets(start_date);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_expense_type_id ON expense_budgets(expense_type_id);
