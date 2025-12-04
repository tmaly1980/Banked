-- Migration: Convert expense_types to shared global table
-- Removes user_id and default_amount fields

-- Step 1: Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own expense types" ON expense_types;
DROP POLICY IF EXISTS "Users can insert their own expense types" ON expense_types;
DROP POLICY IF EXISTS "Users can update their own expense types" ON expense_types;
DROP POLICY IF EXISTS "Users can delete their own expense types" ON expense_types;

-- Step 2: Drop the unique constraint that includes user_id
ALTER TABLE expense_types DROP CONSTRAINT IF EXISTS expense_types_user_id_name_key;

-- Step 3: Remove user_id and default_amount columns
ALTER TABLE expense_types DROP COLUMN IF EXISTS user_id;
ALTER TABLE expense_types DROP COLUMN IF EXISTS default_amount;

-- Step 4: Add unique constraint on name
ALTER TABLE expense_types ADD CONSTRAINT expense_types_name_key UNIQUE (name);

-- Step 5: Create new RLS policies for shared access
CREATE POLICY "Anyone can view expense types"
  ON expense_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert expense types"
  ON expense_types FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update expense types"
  ON expense_types FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete expense types"
  ON expense_types FOR DELETE
  USING (auth.uid() IS NOT NULL);
