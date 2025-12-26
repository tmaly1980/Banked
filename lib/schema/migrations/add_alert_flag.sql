-- Add alert_flag column to bills table
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS alert_flag BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bills_alert_flag ON bills(alert_flag) WHERE alert_flag = TRUE;
