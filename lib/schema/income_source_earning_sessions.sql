-- Income Source Earning Sessions Table
-- Tracks time-based earning sessions with start/end times

CREATE TABLE IF NOT EXISTS income_source_earning_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE, -- NULL means session is currently active
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE income_source_earning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own earning sessions"
  ON income_source_earning_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earning sessions"
  ON income_source_earning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own earning sessions"
  ON income_source_earning_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own earning sessions"
  ON income_source_earning_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_earning_sessions_user_id ON income_source_earning_sessions(user_id);
CREATE INDEX idx_earning_sessions_source_id ON income_source_earning_sessions(income_source_id);
CREATE INDEX idx_earning_sessions_active ON income_source_earning_sessions(user_id, income_source_id, end_datetime);
CREATE INDEX idx_earning_sessions_start_time ON income_source_earning_sessions(start_datetime);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_earning_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_earning_sessions_updated_at
  BEFORE UPDATE ON income_source_earning_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_earning_sessions_updated_at();
