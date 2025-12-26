-- Combined view for all user bills with calculated next_due_date, overdue status, etc.
-- Automatically filters by authenticated user (auth.uid())
-- Query with: supabase.from('user_bills_view').select('*')
-- Filter overdue: .eq('is_overdue', true)
-- Filter upcoming: .eq('is_upcoming', true)
-- Specific bill: .eq('id', billId).single()

CREATE OR REPLACE VIEW user_bills_view AS
WITH bill_payment_summary AS (
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
  WHERE bp.user_id = auth.uid()
  GROUP BY bp.bill_id
),
current_period_payments AS (
  -- Calculate payments for the current billing period
  SELECT 
    bp.bill_id,
    SUM(bp.amount) as current_period_paid
  FROM bill_payments bp
  WHERE bp.user_id = auth.uid()
    AND COALESCE(bp.applied_month_year, TO_CHAR(bp.payment_date, 'YYYY-MM')) = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  GROUP BY bp.bill_id
),
latest_statements AS (
  -- Get the most recent statement for each bill
  SELECT DISTINCT ON (bs.bill_id)
    bs.bill_id,
    bs.statement_date,
    bs.balance as statement_balance,
    bs.minimum_due as statement_minimum_due,
    (bs.balance - COALESCE(
      (SELECT SUM(bp.amount + COALESCE(bp.additional_fees, 0))
       FROM bill_payments bp
       WHERE bp.bill_id = bs.bill_id
         AND bp.payment_date >= bs.statement_date
         AND bp.payment_date <= CURRENT_DATE
         AND bp.user_id = auth.uid()),
      0
    )) as updated_balance
  FROM bill_statements bs
  WHERE bs.user_id = auth.uid()
  ORDER BY bs.bill_id, bs.statement_date DESC
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
    b.is_variable,
    b.category_id,
    b.notes,
    b.start_month_year,
    b.end_month_year,
    b.created_at,
    b.updated_at,
    bp.last_payment_date,
    bp.total_paid,
    cpp.current_period_paid,
    ls.statement_date,
    ls.statement_balance,
    ls.statement_minimum_due,
    ls.updated_balance,
    CASE
      -- One-time bill: use the due_date
      WHEN b.due_date IS NOT NULL THEN b.due_date::DATE
      
      -- Recurring bill with payments: check if current period is fully paid
      WHEN b.due_day IS NOT NULL AND bp.last_applied_month_year IS NOT NULL THEN
        CASE
          -- Current period fully paid (sum >= amount) AND payment is for current or future month
          WHEN bp.last_applied_month_year >= TO_CHAR(CURRENT_DATE, 'YYYY-MM') 
               AND COALESCE(cpp.current_period_paid, 0) >= b.amount THEN
            -- Move to next month
            make_date(
              EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
              EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
              b.due_day
            )
          -- Current period partially paid OR last payment is for past month
          ELSE
            -- Stay on current month (or the month of last payment if in future)
            CASE
              WHEN bp.last_applied_month_year > TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN
                -- Last payment is for future month, use that month
                make_date(
                  EXTRACT(YEAR FROM (bp.last_applied_month_year || '-01')::DATE)::int,
                  EXTRACT(MONTH FROM (bp.last_applied_month_year || '-01')::DATE)::int,
                  b.due_day
                )
              ELSE
                -- Use current month
                make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int,
                  EXTRACT(MONTH FROM CURRENT_DATE)::int,
                  b.due_day
                )
            END
        END
      
      -- Recurring bill with no payments: check start_month_year
      WHEN b.due_day IS NOT NULL THEN
        CASE
          -- If start_month_year exists and is in the future, use that month
          WHEN b.start_month_year IS NOT NULL AND b.start_month_year > TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN
            make_date(
              EXTRACT(YEAR FROM (b.start_month_year || '-01')::DATE)::int,
              EXTRACT(MONTH FROM (b.start_month_year || '-01')::DATE)::int,
              b.due_day
            )
          -- Otherwise use current month
          ELSE
            make_date(
              EXTRACT(YEAR FROM CURRENT_DATE)::int,
              EXTRACT(MONTH FROM CURRENT_DATE)::int,
              b.due_day
            )
        END
      
      ELSE NULL
    END as calculated_due_date
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  WHERE b.user_id = auth.uid()
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
  bdd.is_variable,
  bdd.category_id,
  bdd.notes,
  bdd.start_month_year,
  bdd.end_month_year,
  bdd.created_at,
  bdd.updated_at,
  -- Variable bill statement fields
  bdd.statement_date,
  bdd.statement_balance,
  bdd.statement_minimum_due,
  bdd.updated_balance,
  -- Apply end_month_year constraint: if calculated_due_date is after end_month_year, set to NULL
  CASE
    WHEN bdd.end_month_year IS NOT NULL 
         AND TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') > bdd.end_month_year THEN NULL
    ELSE bdd.calculated_due_date
  END as next_due_date,
  CASE 
    WHEN bdd.calculated_due_date IS NOT NULL 
         AND (bdd.end_month_year IS NULL OR TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') <= bdd.end_month_year)
    THEN 
      CURRENT_DATE - bdd.calculated_due_date
    ELSE NULL
  END as days_until_due,
  CASE 
    WHEN bdd.calculated_due_date IS NOT NULL 
         AND (bdd.end_month_year IS NULL OR TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') <= bdd.end_month_year)
    THEN 
      bdd.calculated_due_date < CURRENT_DATE
    ELSE FALSE
  END as is_overdue,
  CASE 
    WHEN bdd.calculated_due_date IS NOT NULL 
         AND (bdd.end_month_year IS NULL OR TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') <= bdd.end_month_year)
    THEN 
      bdd.calculated_due_date >= CURRENT_DATE
    ELSE FALSE
  END as is_upcoming,
  bdd.last_payment_date,
  COALESCE(bdd.total_paid, 0) as total_paid,
  -- Current billing period payment tracking
  bdd.amount as total_amount,
  COALESCE(bdd.current_period_paid, 0) as partial_payment,
  CASE 
    WHEN COALESCE(bdd.current_period_paid, 0) >= bdd.amount THEN 0
    ELSE bdd.amount - COALESCE(bdd.current_period_paid, 0)
  END as remaining_amount
FROM bill_due_dates bdd
ORDER BY 
  CASE WHEN bdd.deferred_flag THEN 1 ELSE 0 END,
  CASE 
    WHEN bdd.calculated_due_date IS NULL 
         OR (bdd.end_month_year IS NOT NULL AND TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') > bdd.end_month_year)
    THEN 1 
    ELSE 0 
  END,
  CASE
    WHEN bdd.end_month_year IS NOT NULL 
         AND TO_CHAR(bdd.calculated_due_date, 'YYYY-MM') > bdd.end_month_year THEN NULL
    ELSE bdd.calculated_due_date
  END ASC,
  bdd.priority DESC,
  bdd.name ASC;

-- Grant select permission to authenticated users
GRANT SELECT ON user_bills_view TO authenticated;

-- Example usage in your application:
-- All bills: const { data } = await supabase.from('user_bills_view').select('*');
-- Overdue: const { data } = await supabase.from('user_bills_view').select('*').eq('is_overdue', true);
-- Upcoming: const { data } = await supabase.from('user_bills_view').select('*').eq('is_upcoming', true);
-- Specific: const { data } = await supabase.from('user_bills_view').select('*').eq('id', billId).single();
