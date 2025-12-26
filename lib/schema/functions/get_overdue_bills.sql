-- Function to get overdue bills for a user
-- Returns bills where the next due date is in the past and the bill hasn't been paid for that period

CREATE OR REPLACE FUNCTION get_overdue_bills(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  amount NUMERIC,
  due_date TIMESTAMPTZ,
  due_day INTEGER,
  priority TEXT,
  loss_risk_flag BOOLEAN,
  deferred_flag BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  next_due_date DATE,
  days_overdue INTEGER,
  last_payment_date TIMESTAMPTZ,
  total_paid NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH bill_payments AS (
    -- Get the most recent payment for each bill
    SELECT 
      bp.bill_id,
      MAX(COALESCE(
        CASE 
          WHEN bp.applied_month_year IS NOT NULL 
          THEN (bp.applied_month_year || '-01')::DATE 
          ELSE bp.payment_date 
        END,
        bp.payment_date
      )) as last_payment_date,
      SUM(bp.amount) as total_paid
    FROM bill_payments bp
    WHERE bp.user_id = p_user_id
    GROUP BY bp.bill_id
  ),
  bill_due_dates AS (
    -- Calculate next due date for each bill
    SELECT 
      b.id,
      b.user_id,
      b.name,
      b.amount,
      b.due_date,
      b.due_day,
      b.priority,
      b.loss_risk_flag,
      b.deferred_flag,
      b.notes,
      b.created_at,
      b.updated_at,
      bp.last_payment_date,
      bp.total_paid,
      CASE
        -- One-time bill: use the due_date
        WHEN b.due_date IS NOT NULL THEN b.due_date::DATE
        
        -- Recurring bill: calculate next occurrence after last payment
        WHEN b.due_day IS NOT NULL AND bp.last_payment_date IS NOT NULL THEN
          -- Calculate the due date in the month after the last payment
          CASE
            WHEN EXTRACT(DAY FROM bp.last_payment_date) < b.due_day THEN
              -- If payment was before the due day, use same month
              DATE_TRUNC('month', bp.last_payment_date)::DATE + (b.due_day - 1)
            ELSE
              -- If payment was on/after due day, use next month
              (DATE_TRUNC('month', bp.last_payment_date) + INTERVAL '1 month')::DATE + (b.due_day - 1)
          END
        
        -- Recurring bill with no payments: use current month
        WHEN b.due_day IS NOT NULL THEN
          CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) < b.due_day THEN
              DATE_TRUNC('month', CURRENT_DATE)::DATE + (b.due_day - 1)
            ELSE
              (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE + (b.due_day - 1)
          END
        
        ELSE NULL
      END as next_due_date
    FROM bills b
    LEFT JOIN bill_payments bp ON b.id = bp.bill_id
    WHERE b.user_id = p_user_id
      AND b.deferred_flag = FALSE
  )
  SELECT 
    bdd.id,
    bdd.user_id,
    bdd.name,
    bdd.amount,
    bdd.due_date,
    bdd.due_day,
    bdd.priority,
    bdd.loss_risk_flag,
    bdd.deferred_flag,
    bdd.notes,
    bdd.created_at,
    bdd.updated_at,
    bdd.next_due_date,
    CURRENT_DATE - bdd.next_due_date as days_overdue,
    bdd.last_payment_date,
    COALESCE(bdd.total_paid, 0) as total_paid
  FROM bill_due_dates bdd
  WHERE bdd.next_due_date IS NOT NULL
    AND bdd.next_due_date < CURRENT_DATE
  ORDER BY bdd.next_due_date ASC, bdd.priority DESC, bdd.name ASC;
END;
$$;

-- Example usage:
-- SELECT * FROM get_overdue_bills('your-user-id-here');

-- To use in your application, you can call this function via Supabase:
-- const { data, error } = await supabase.rpc('get_overdue_bills', { p_user_id: userId });
