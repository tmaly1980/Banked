-- Add account_name column to account_info table
ALTER TABLE account_info
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Create index for better query performance when searching by account_name
CREATE INDEX IF NOT EXISTS idx_account_info_account_name ON account_info(account_name);
