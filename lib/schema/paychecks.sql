-- Paychecks Table
CREATE TABLE IF NOT EXISTS paychecks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own paychecks"
  ON paychecks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paychecks"
  ON paychecks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paychecks"
  ON paychecks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own paychecks"
  ON paychecks FOR DELETE
  USING (auth.uid() = user_id);
