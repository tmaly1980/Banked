-- Create gigs table
create table gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,

  due_date date not null,
  est_hours_total numeric(6,2) not null check (est_hours_total > 0),

  hours_logged numeric(6,2) not null default 0,

  hours_remaining numeric(6,2) generated always as (
    greatest(est_hours_total - hours_logged, 0)
  ) stored,

  is_completed boolean generated always as (
    hours_remaining = 0
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create trigger gigs_set_updated_at
before update on gigs
for each row execute function set_updated_at();

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


-- Gig schedule (time planned)
create table gig_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gig_id uuid not null references gigs(id) on delete cascade,

  day date not null,
  planned_hours numeric(5,2) not null default 0 check (planned_hours >= 0),
  completed_hours numeric(5,2) not null default 0 check (completed_hours >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (gig_id, day)
);

create index gig_schedule_user_day_idx on gig_schedule(user_id, day);
create index gig_schedule_gig_idx on gig_schedule(gig_id);

create trigger gig_schedule_set_updated_at
before update on gig_schedule
for each row execute function set_updated_at();

-- Gig sessions (time put in)
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

create table weekly_work_schedule (
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=Sunday

  is_day_off boolean not null default false,
  max_hours numeric(4,2) not null default 0 check (max_hours >= 0),

  primary key (user_id, weekday)
);