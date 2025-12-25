-- Financial Goals Table
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2),
  due_date DATE,
  due_month TEXT, -- Format: YYYY-MM
  due_week TEXT, -- Format: YYYY-Www (ISO week)
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'completed', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount DECIMAL(10, 2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add computed search column for full-text search
ALTER TABLE financial_goals ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  ) STORED;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS financial_goals_search_idx ON financial_goals USING GIN(search_vector);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS financial_goals_user_id_idx ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS financial_goals_due_month_idx ON financial_goals(due_month);
CREATE INDEX IF NOT EXISTS financial_goals_due_week_idx ON financial_goals(due_week);
CREATE INDEX IF NOT EXISTS financial_goals_status_idx ON financial_goals(status);

-- Add computed search column to bills table for matching
ALTER TABLE bills ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(notes, '')), 'B')
  ) STORED;

-- Create index for bills full-text search
CREATE INDEX IF NOT EXISTS bills_search_idx ON bills USING GIN(search_vector);

-- Enable RLS
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own financial goals"
  ON financial_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial goals"
  ON financial_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial goals"
  ON financial_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial goals"
  ON financial_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_goals_updated_at();
