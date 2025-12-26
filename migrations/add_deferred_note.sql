-- Add deferred_flag and deferred_note columns to bills table
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS deferred_flag BOOLEAN DEFAULT FALSE;

ALTER TABLE bills
ADD COLUMN IF NOT EXISTS deferred_note TEXT;

-- Add comments to columns
COMMENT ON COLUMN bills.deferred_flag IS 'Flag indicating if this bill payment is deferred';
COMMENT ON COLUMN bills.deferred_note IS 'Notes about why this bill payment is deferred';
