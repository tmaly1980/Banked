-- Banked App Database Schema
-- Run this SQL in your Supabase SQL editor to create all required tables

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  loss_risk_flag BOOLEAN DEFAULT false,
  deferred_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bills"
  ON bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
  ON bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
  ON bills FOR DELETE
  USING (auth.uid() = user_id);

-- Bill Payments Table
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES bills ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bill payments"
  ON bill_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bill payments"
  ON bill_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill payments"
  ON bill_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill payments"
  ON bill_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Paychecks Table
CREATE TABLE IF NOT EXISTS paychecks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
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

-- Expense Types Table
CREATE TABLE IF NOT EXISTS expense_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  default_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense types"
  ON expense_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense types"
  ON expense_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense types"
  ON expense_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense types"
  ON expense_types FOR DELETE
  USING (auth.uid() = user_id);

-- Weekly Expenses Table
CREATE TABLE IF NOT EXISTS weekly_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  expense_type_id UUID REFERENCES expense_types ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, expense_type_id, week_start_date)
);

ALTER TABLE weekly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly expenses"
  ON weekly_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly expenses"
  ON weekly_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly expenses"
  ON weekly_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly expenses"
  ON weekly_expenses FOR DELETE
  USING (auth.uid() = user_id);
