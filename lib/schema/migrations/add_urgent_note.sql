-- Add urgent_note column to bills table
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS urgent_note TEXT;

-- Create index for bills with urgent notes
CREATE INDEX IF NOT EXISTS idx_bills_urgent_note ON bills(id) WHERE urgent_note IS NOT NULL AND urgent_note != '';
