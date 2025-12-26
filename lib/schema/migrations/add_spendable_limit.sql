-- Add spendable_limit column to account_info table
ALTER TABLE account_info
ADD COLUMN IF NOT EXISTS spendable_limit NUMERIC(12, 2);

-- Create index for better query performance when filtering by spendable_limit
CREATE INDEX IF NOT EXISTS idx_account_info_spendable_limit ON account_info(spendable_limit) WHERE spendable_limit IS NOT NULL;
