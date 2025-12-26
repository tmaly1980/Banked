-- Add support for variable balance bills (credit cards, utilities with variable amounts)

-- Add is_variable flag to bills table
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT FALSE;

-- Make amount nullable for variable bills
ALTER TABLE bills 
ALTER COLUMN amount DROP NOT NULL;

-- Create bill_statements table for variable balance tracking
CREATE TABLE IF NOT EXISTS bill_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  balance DECIMAL(10, 2) NOT NULL,
  minimum_due DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bill_statements_bill_id ON bill_statements(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_statements_user_id ON bill_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_statements_statement_date ON bill_statements(statement_date);

-- Enable RLS
ALTER TABLE bill_statements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bill statements"
  ON bill_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bill statements"
  ON bill_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill statements"
  ON bill_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill statements"
  ON bill_statements FOR DELETE
  USING (auth.uid() = user_id);

-- Add additional_fees column to bill_payments for late fees, etc.
ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS additional_fees DECIMAL(10, 2) DEFAULT 0;

-- Create function to get latest statement for a bill
CREATE OR REPLACE FUNCTION get_latest_bill_statement(p_bill_id UUID)
RETURNS TABLE (
  id UUID,
  statement_date DATE,
  balance DECIMAL(10, 2),
  minimum_due DECIMAL(10, 2),
  updated_balance DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.statement_date,
    bs.balance,
    bs.minimum_due,
    (bs.balance - COALESCE(
      (SELECT SUM(bp.amount + COALESCE(bp.additional_fees, 0))
       FROM bill_payments bp
       WHERE bp.bill_id = p_bill_id
         AND bp.payment_date >= bs.statement_date
         AND bp.payment_date <= CURRENT_DATE),
      0
    )) as updated_balance
  FROM bill_statements bs
  WHERE bs.bill_id = p_bill_id
  ORDER BY bs.statement_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
