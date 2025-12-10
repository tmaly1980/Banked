-- Weekly Income Goals Table
-- Stores income goals per day of the week with versioning support

CREATE TABLE IF NOT EXISTS weekly_income_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_year_week TEXT NOT NULL, -- Format: "2025-W50"
  ending_year_week TEXT, -- NULL means current/ongoing, or format: "2025-W51"
  total_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sunday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tuesday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  wednesday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  thursday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  friday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  saturday_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE weekly_income_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly income goals"
  ON weekly_income_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly income goals"
  ON weekly_income_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly income goals"
  ON weekly_income_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly income goals"
  ON weekly_income_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_weekly_income_goals_user_id ON weekly_income_goals(user_id);
CREATE INDEX idx_weekly_income_goals_year_week ON weekly_income_goals(user_id, starting_year_week, ending_year_week);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_weekly_income_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_income_goals_updated_at
  BEFORE UPDATE ON weekly_income_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_income_goals_updated_at();
