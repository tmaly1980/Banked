-- Gigs Table
create table gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,
  
  due_date date not null,
  est_hours_total numeric(6,2) not null check (est_hours_total > 0),

  -- cached values
  hours_logged numeric(6,2) not null default 0,
  hours_remaining numeric(6,2) generated always as (
    greatest(est_hours_total - hours_logged, 0)
  ) stored,
  is_completed boolean generated always as (
    greatest(est_hours_total - hours_logged, 0) = 0
  ) stored,
  checklist JSONB DEFAULT '[]'::JSONB,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gigs_user_id_idx on gigs(user_id);
create index gigs_due_date_idx on gigs(due_date);

create trigger gigs_set_updated_at
before update on gigs
for each row execute function set_updated_at();

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
CREATE INDEX idx_gigs_due_date ON gigs(due_date);
CREATE INDEX idx_gigs_checklist ON gigs USING GIN(checklist);
CREATE INDEX idx_gig_paychecks_gig_id ON gig_paychecks(gig_id);
CREATE INDEX idx_gig_paychecks_paycheck_id ON gig_paychecks(paycheck_id);


-- Gig Sessions
create table gig_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gig_id uuid not null references gigs(id) on delete cascade,

  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer generated always as (
    case
      when ended_at is not null then
        extract(epoch from (ended_at - started_at))::int / 60
      else null
    end
  ) stored,

  source text not null default 'timer', -- 'timer' | 'manual' | 'import'
  note text,

  created_at timestamptz not null default now()
);

create index gig_sessions_user_idx on gig_sessions(user_id, started_at);
create index gig_sessions_gig_idx on gig_sessions(gig_id, started_at);