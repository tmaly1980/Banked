-- Income Source Daily Earnings Table
-- Stores actual earnings per income source per day

CREATE TABLE IF NOT EXISTS income_source_daily_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- The specific date for these earnings
  earnings_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, income_source_id, date)
);

-- Enable RLS
ALTER TABLE income_source_daily_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily earnings"
  ON income_source_daily_earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily earnings"
  ON income_source_daily_earnings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily earnings"
  ON income_source_daily_earnings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily earnings"
  ON income_source_daily_earnings FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_daily_earnings_user_id ON income_source_daily_earnings(user_id);
CREATE INDEX idx_daily_earnings_source_date ON income_source_daily_earnings(income_source_id, date);
CREATE INDEX idx_daily_earnings_date ON income_source_daily_earnings(user_id, date);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_daily_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_earnings_updated_at
  BEFORE UPDATE ON income_source_daily_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_earnings_updated_at();
