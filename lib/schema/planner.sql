-- Planner Income Configuration
CREATE TABLE IF NOT EXISTS planner_income_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Gig work
  gig_days_per_week NUMERIC(3,1) DEFAULT 0 CHECK (gig_days_per_week >= 0 AND gig_days_per_week <= 7),
  gig_income_per_day NUMERIC(10,2) DEFAULT 0 CHECK (gig_income_per_day >= 0),
  
  -- Project work
  project_hours_per_week NUMERIC(5,1) DEFAULT 0 CHECK (project_hours_per_week >= 0),
  project_income_per_month NUMERIC(10,2) DEFAULT 0 CHECK (project_income_per_month >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  10
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE planner_income_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own income config"
  ON planner_income_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income config"
  ON planner_income_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income config"
  ON planner_income_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income config"
  ON planner_income_config FOR DELETE
  USING (auth.uid() = user_id);

-- Planner Bills
CREATE TABLE IF NOT EXISTS planner_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  
  bill_type TEXT NOT NULL CHECK (bill_type IN ('housing', 'utilities', 'food_gas', 'loans', 'debts')),
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE planner_bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own planner bills"
  ON planner_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planner bills"
  ON planner_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner bills"
  ON planner_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner bills"
  ON planner_bills FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_planner_income_config_user_id ON planner_income_config(user_id);
CREATE INDEX idx_planner_bills_user_id ON planner_bills(user_id);
CREATE INDEX idx_planner_bills_type ON planner_bills(bill_type);

-- Triggers for updated_at
CREATE TRIGGER planner_income_config_set_updated_at
  BEFORE UPDATE ON planner_income_config
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER planner_bills_set_updated_at
  BEFORE UPDATE ON planner_bills
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Planner Gig Income (daily entries)
CREATE TABLE IF NOT EXISTS planner_gig_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE planner_gig_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own gig income"
  ON planner_gig_income FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gig income"
  ON planner_gig_income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gig income"
  ON planner_gig_income FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gig income"
  ON planner_gig_income FOR DELETE
  USING (auth.uid() = user_id);

-- Planner Project Hours (daily entries)
CREATE TABLE IF NOT EXISTS planner_project_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  
  date DATE NOT NULL,
  hours NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE planner_project_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own project hours"
  ON planner_project_hours FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project hours"
  ON planner_project_hours FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project hours"
  ON planner_project_hours FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project hours"
  ON planner_project_hours FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_planner_gig_income_user_date ON planner_gig_income(user_id, date);
CREATE INDEX idx_planner_project_hours_user_date ON planner_project_hours(user_id, date);

-- Triggers for updated_at
CREATE TRIGGER planner_gig_income_set_updated_at
  BEFORE UPDATE ON planner_gig_income
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER planner_project_hours_set_updated_at
  BEFORE UPDATE ON planner_project_hours
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
