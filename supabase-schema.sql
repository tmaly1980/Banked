-- ============================================
-- Banked App - Supabase Database Schema
-- ============================================
-- Run this entire file in your Supabase SQL Editor
-- to create all tables and security policies
-- ============================================

-- ============================================
-- CREATE TABLES
-- ============================================

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  loss_risk_flag BOOLEAN DEFAULT false,
  deferred_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Payments Table
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  applied_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paychecks Table
CREATE TABLE IF NOT EXISTS paychecks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALTER TABLES (Add new columns if needed)
-- ============================================

-- Add notes column to bills if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bills' AND column_name='notes'
  ) THEN
    ALTER TABLE bills ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add notes column to paychecks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='paychecks' AND column_name='notes'
  ) THEN
    ALTER TABLE paychecks ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE paychecks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (for updates)
DROP POLICY IF EXISTS "Users can only see their own bills" ON bills;
DROP POLICY IF EXISTS "Users can only see their own bill payments" ON bill_payments;
DROP POLICY IF EXISTS "Users can only see their own paychecks" ON paychecks;

-- Bills Policies
CREATE POLICY "Users can only see their own bills" 
  ON bills
  FOR ALL 
  USING (auth.uid() = user_id);

-- Bill Payments Policies
CREATE POLICY "Users can only see their own bill payments" 
  ON bill_payments
  FOR ALL 
  USING (auth.uid() = user_id);

-- Paychecks Policies
CREATE POLICY "Users can only see their own paychecks" 
  ON paychecks
  FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for bills by user and deferred status
CREATE INDEX IF NOT EXISTS idx_bills_user_deferred 
  ON bills(user_id, deferred_flag);

-- Index for bills by user and due date
CREATE INDEX IF NOT EXISTS idx_bills_user_due_date 
  ON bills(user_id, due_date);

-- Index for bill payments by bill
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill 
  ON bill_payments(bill_id);

-- Index for paychecks by user and date
CREATE INDEX IF NOT EXISTS idx_paychecks_user_date 
  ON paychecks(user_id, date);

-- ============================================
-- OPTIONAL: CREATE UPDATED_AT TRIGGER
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;

-- Create trigger for bills table
CREATE TRIGGER update_bills_updated_at 
  BEFORE UPDATE ON bills 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify your setup worked correctly
-- ============================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('bills', 'bill_payments', 'paychecks');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('bills', 'bill_payments', 'paychecks');

-- Check policies exist
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public';
