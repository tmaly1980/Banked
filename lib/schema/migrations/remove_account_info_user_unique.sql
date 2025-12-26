-- Remove unique constraint on user_id to allow multiple accounts per user
ALTER TABLE account_info
DROP CONSTRAINT IF EXISTS account_info_user_id_key;

-- Add index for user_id lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_account_info_user_id ON account_info(user_id);
