-- Create gigs table
CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours NUMERIC,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gig_paychecks junction table to link paychecks to gigs
CREATE TABLE IF NOT EXISTS gig_paychecks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  paycheck_id UUID NOT NULL REFERENCES paychecks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gig_id, paycheck_id)
);

-- Enable RLS
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_paychecks ENABLE ROW LEVEL SECURITY;

-- Create policies for gigs
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

-- Create policies for gig_paychecks
CREATE POLICY "Users can view their own gig paychecks"
  ON gig_paychecks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_paychecks.gig_id
      AND gigs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own gig paychecks"
  ON gig_paychecks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_paychecks.gig_id
      AND gigs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own gig paychecks"
  ON gig_paychecks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_paychecks.gig_id
      AND gigs.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_gigs_user_id ON gigs(user_id);
CREATE INDEX idx_gigs_start_date ON gigs(start_date);
CREATE INDEX idx_gigs_end_date ON gigs(end_date);
CREATE INDEX idx_gig_paychecks_gig_id ON gig_paychecks(gig_id);
CREATE INDEX idx_gig_paychecks_paycheck_id ON gig_paychecks(paycheck_id);
