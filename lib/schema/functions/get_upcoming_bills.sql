-- Function to get upcoming bills for a user with calculated next due dates
-- Returns bills with next_due_date, days_until_due, and last payment information

CREATE OR REPLACE FUNCTION get_upcoming_bills(p_user_id UUID)
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
  category_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  next_due_date DATE,
  days_until_due INTEGER,
  is_overdue BOOLEAN,
  last_payment_date TIMESTAMPTZ,
  total_paid NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH bill_payments AS (
    -- Get the most recent payment and its applied month/year for each bill
    SELECT 
      bp.bill_id,
      MAX(COALESCE(
        bp.applied_month_year,
        TO_CHAR(bp.payment_date, 'YYYY-MM')
      )) as last_applied_month_year,
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
      b.category_id,
      b.notes,
      b.created_at,
      b.updated_at,
      bp.last_payment_date,
      bp.total_paid,
      CASE
        -- One-time bill: use the due_date
        WHEN b.due_date IS NOT NULL THEN b.due_date::DATE
        
        -- Recurring bill with payments: check applied_month_year against current month
        WHEN b.due_day IS NOT NULL AND bp.last_applied_month_year IS NOT NULL THEN
          -- Get current month in YYYY-MM format
          CASE
            WHEN bp.last_applied_month_year >= TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN
              -- Already has payment for current or future month, use next month
              make_date(
                EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
                EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
                b.due_day
              )
            ELSE
              -- Last payment is for a past month, use current month
              make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM CURRENT_DATE)::int,
                b.due_day
              )
          END
        
        -- Recurring bill with no payments: always use current month
        WHEN b.due_day IS NOT NULL THEN
          make_date(
            EXTRACT(YEAR FROM CURRENT_DATE)::int,
            EXTRACT(MONTH FROM CURRENT_DATE)::int,
            b.due_day
          )
        
        ELSE NULL
      END as next_due_date
    FROM bills b
    LEFT JOIN bill_payments bp ON b.id = bp.bill_id
    WHERE b.user_id = p_user_id
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
    bdd.category_id,
    bdd.notes,
    bdd.created_at,
    bdd.updated_at,
    bdd.next_due_date,
    CASE 
      WHEN bdd.next_due_date IS NOT NULL THEN 
        bdd.next_due_date - CURRENT_DATE
      ELSE NULL
    END as days_until_due,
    CASE 
      WHEN bdd.next_due_date IS NOT NULL THEN 
        bdd.next_due_date < CURRENT_DATE
      ELSE FALSE
    END as is_overdue,
    bdd.last_payment_date,
    COALESCE(bdd.total_paid, 0) as total_paid
  FROM bill_due_dates bdd
  ORDER BY 
    CASE WHEN bdd.deferred_flag THEN 1 ELSE 0 END,
    CASE WHEN bdd.next_due_date IS NULL THEN 1 ELSE 0 END,
    bdd.next_due_date ASC,
    bdd.priority DESC,
    bdd.name ASC;
END;
$$;

-- Example usage:
-- SELECT * FROM get_upcoming_bills('your-user-id-here');

-- To use in your application, you can call this function via Supabase:
-- const { data, error } = await supabase.rpc('get_upcoming_bills', { p_user_id: userId });
