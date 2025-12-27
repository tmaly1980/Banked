-- Planned Expenses Table
CREATE TABLE IF NOT EXISTS planned_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  budgeted_amount NUMERIC NOT NULL,
  funded_amount NUMERIC DEFAULT 0,
  planned_date DATE NOT NULL,
  is_scheduled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE planned_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planned expenses"
  ON planned_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planned expenses"
  ON planned_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned expenses"
  ON planned_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned expenses"
  ON planned_expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on planned_date for sorting
CREATE INDEX IF NOT EXISTS idx_planned_expenses_planned_date ON planned_expenses(user_id, planned_date);
