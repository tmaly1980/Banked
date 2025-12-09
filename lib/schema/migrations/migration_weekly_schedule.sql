-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS weekly_work_schedule CASCADE;

-- Create the weekly_work_schedule table
CREATE TABLE weekly_work_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  available BOOLEAN NOT NULL DEFAULT true,
  max_hours NUMERIC(4,2) CHECK (max_hours >= 0 AND max_hours <= 24),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, weekday)
);

-- Enable RLS
ALTER TABLE weekly_work_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly work schedule"
  ON weekly_work_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly work schedule"
  ON weekly_work_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly work schedule"
  ON weekly_work_schedule FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly work schedule"
  ON weekly_work_schedule FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_weekly_work_schedule_user_id ON weekly_work_schedule(user_id);
CREATE INDEX idx_weekly_work_schedule_weekday ON weekly_work_schedule(weekday);

-- Trigger for updated_at (using the existing moddatetime function)
CREATE TRIGGER weekly_work_schedule_set_updated_at
  BEFORE UPDATE ON weekly_work_schedule
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();