-- Migration: Recurring Paychecks
-- Date: 2024-12-04
-- Description: Add recurring_paychecks table and link to paychecks table

-- Step 1: Create recurring_paychecks table
CREATE TABLE IF NOT EXISTS recurring_paychecks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  recurrence_unit TEXT NOT NULL CHECK (recurrence_unit IN ('week', 'month')),
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  day_of_week TEXT CHECK (day_of_week IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  last_day_of_month BOOLEAN NOT NULL DEFAULT false,
  last_business_day_of_month BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add RLS policies for recurring_paychecks
ALTER TABLE recurring_paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring paychecks"
  ON recurring_paychecks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring paychecks"
  ON recurring_paychecks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring paychecks"
  ON recurring_paychecks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring paychecks"
  ON recurring_paychecks FOR DELETE
  USING (auth.uid() = user_id);

-- Step 3: Add indexes for recurring_paychecks
CREATE INDEX IF NOT EXISTS idx_recurring_paychecks_user_id 
  ON recurring_paychecks(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_paychecks_date_range 
  ON recurring_paychecks(user_id, start_date, end_date);

-- Step 4: Add recurring_paycheck_id to paychecks table
ALTER TABLE paychecks
ADD COLUMN recurring_paycheck_id UUID REFERENCES recurring_paychecks(id) ON DELETE SET NULL;

-- Step 5: Add index for recurring_paycheck_id lookup
CREATE INDEX IF NOT EXISTS idx_paychecks_recurring_id 
  ON paychecks(recurring_paycheck_id);

-- Step 6: Add constraint to ensure valid day configuration
-- If recurrence_unit is 'week', day_of_week must be set
-- If recurrence_unit is 'month', one of day_of_month, last_day_of_month, or last_business_day_of_month must be true/set
ALTER TABLE recurring_paychecks
ADD CONSTRAINT recurring_paychecks_day_configuration_check
CHECK (
  (recurrence_unit = 'week' AND day_of_week IS NOT NULL) OR
  (recurrence_unit = 'month' AND (
    day_of_month IS NOT NULL OR 
    last_day_of_month = true OR 
    last_business_day_of_month = true
  ))
);

-- Migration complete
-- Note: Run this migration in a transaction and test thoroughly before applying to production
