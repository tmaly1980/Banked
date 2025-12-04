-- Gigs Table
CREATE TABLE IF NOT EXISTS gigs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_hours NUMERIC,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gigs"
  ON gigs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gigs"
  ON gigs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gigs"
  ON gigs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gigs"
  ON gigs FOR DELETE
  USING (auth.uid() = user_id);

-- Gig Paychecks Junction Table
CREATE TABLE IF NOT EXISTS gig_paychecks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  gig_id UUID REFERENCES gigs ON DELETE CASCADE NOT NULL,
  paycheck_id UUID REFERENCES paychecks ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(gig_id, paycheck_id)
);

ALTER TABLE gig_paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gig paychecks"
  ON gig_paychecks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gig paychecks"
  ON gig_paychecks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gig paychecks"
  ON gig_paychecks FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_gigs_user_id ON gigs(user_id);
CREATE INDEX idx_gigs_start_date ON gigs(start_date);
CREATE INDEX idx_gigs_end_date ON gigs(end_date);
CREATE INDEX idx_gig_paychecks_gig_id ON gig_paychecks(gig_id);
CREATE INDEX idx_gig_paychecks_paycheck_id ON gig_paychecks(paycheck_id);
