-- Create account_info table to store user account balance and related information
CREATE TABLE IF NOT EXISTS account_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE account_info ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own account info"
  ON account_info
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account info"
  ON account_info
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account info"
  ON account_info
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_account_info_user_id ON account_info(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_account_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_info_updated_at
  BEFORE UPDATE ON account_info
  FOR EACH ROW
  EXECUTE FUNCTION update_account_info_updated_at();
