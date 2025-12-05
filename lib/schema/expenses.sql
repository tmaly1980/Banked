-- Expense Types Order Sequence
CREATE SEQUENCE IF NOT EXISTS expense_types_order_seq START 1;

-- Expense Types Table
CREATE TABLE IF NOT EXISTS expense_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "order" INTEGER NOT NULL DEFAULT nextval('expense_types_order_seq'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view expense types"
  ON expense_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert expense types"
  ON expense_types FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update expense types"
  ON expense_types FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete expense types"
  ON expense_types FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Expense Budgets Table (formerly weekly_expenses)
CREATE TABLE IF NOT EXISTS expense_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  expense_type_id UUID REFERENCES expense_types ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, expense_type_id, start_date)
);

ALTER TABLE expense_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense budgets"
  ON expense_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense budgets"
  ON expense_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense budgets"
  ON expense_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense budgets"
  ON expense_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Expense Purchases Table
CREATE TABLE IF NOT EXISTS expense_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  expense_type_id UUID REFERENCES expense_types ON DELETE CASCADE NOT NULL,
  description TEXT,
  estimated_amount NUMERIC,
  purchase_amount NUMERIC,
  purchase_date TIMESTAMP WITH TIME ZONE,
  checklist JSONB DEFAULT '[]'::jsonb,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
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

-- Create indexes for expense_budgets
CREATE INDEX idx_expense_budgets_user_id ON expense_budgets(user_id);
CREATE INDEX idx_expense_budgets_start_date ON expense_budgets(start_date);
CREATE INDEX idx_expense_budgets_expense_type_id ON expense_budgets(expense_type_id);

-- Create indexes for expense_purchases
CREATE INDEX idx_expense_purchases_user_id ON expense_purchases(user_id);
CREATE INDEX idx_expense_purchases_purchase_date ON expense_purchases(purchase_date);
CREATE INDEX idx_expense_purchases_expense_type_id ON expense_purchases(expense_type_id);
CREATE INDEX idx_expense_purchases_description ON expense_purchases(description);

-- Create index for expense_types order
CREATE INDEX idx_expense_types_order ON expense_types("order");
