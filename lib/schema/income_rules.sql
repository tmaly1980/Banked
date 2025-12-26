-- Income Rules Table
-- Stores income earning rules with flexible frequency and date ranges

CREATE TABLE IF NOT EXISTS income_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  -- For daily frequency: JSON array of day numbers [0-6] where 0=Sunday
  days_of_week JSONB, -- e.g., [1,2,3,4,5] for M-F
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means ongoing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE income_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own income rules"
  ON income_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income rules"
  ON income_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income rules"
  ON income_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income rules"
  ON income_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_income_rules_user_id ON income_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_income_rules_income_source_id ON income_rules(income_source_id);
CREATE INDEX IF NOT EXISTS idx_income_rules_dates ON income_rules(start_date, end_date);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_income_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_income_rules_updated_at
  BEFORE UPDATE ON income_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_income_rules_updated_at();
