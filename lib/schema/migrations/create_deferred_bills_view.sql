-- Create a dedicated view for deferred bills
-- Returns all bills with active deferments (is_active = true)
-- No date range filtering - just gets all actively deferred bills

CREATE OR REPLACE VIEW deferred_bills_view AS
WITH bill_payment_summary AS (
  SELECT 
    bp.bill_id,
    MAX(COALESCE(bp.applied_month_year, TO_CHAR(bp.payment_date, 'YYYY-MM'))) as last_applied_month_year,
    MAX(COALESCE(
      CASE WHEN bp.applied_month_year IS NOT NULL THEN (bp.applied_month_year || '-01')::DATE ELSE bp.payment_date END,
      bp.payment_date
    )) as last_payment_date,
    SUM(bp.amount) as total_paid
  FROM bill_payments bp
  WHERE bp.user_id = auth.uid()
  GROUP BY bp.bill_id
),
current_period_payments AS (
  SELECT 
    bp.bill_id,
    SUM(bp.amount) as current_period_paid
  FROM bill_payments bp
  WHERE bp.user_id = auth.uid()
    AND COALESCE(bp.applied_month_year, TO_CHAR(bp.payment_date, 'YYYY-MM')) = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  GROUP BY bp.bill_id
),
latest_statements AS (
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
active_deferments AS (
  SELECT DISTINCT ON (bd.bill_id)
    bd.bill_id,
    bd.month_year as deferred_month_year,
    bd.decide_by_date,
    bd.loss_date,
    bd.reason as deferment_reason,
    bd.created_at as deferment_created_at
  FROM bill_deferments bd
  WHERE bd.user_id = auth.uid()
    AND bd.is_active = true
  ORDER BY bd.bill_id, bd.created_at DESC
)
SELECT 
  b.id,
  b.user_id,
  b.name,
  b.amount,
  b.due_date,
  b.due_day,
  b.priority,
  b.loss_risk_flag,
  b.alert_flag,
  b.urgent_note,
  b.is_variable,
  b.category_id,
  b.notes,
  b.start_month_year,
  b.end_month_year,
  b.created_at,
  b.updated_at,
  -- Payment tracking
  bp.last_payment_date,
  bp.total_paid,
  cpp.current_period_paid as partial_payment,
  CASE 
    WHEN b.is_variable THEN 
      COALESCE(ls.statement_minimum_due, ls.updated_balance, ls.statement_balance, 0)
    ELSE 
      GREATEST(COALESCE(b.amount, 0) - COALESCE(cpp.current_period_paid, 0), 0)
  END as remaining_amount,
  -- Variable bill statement info
  ls.statement_date,
  ls.statement_balance,
  ls.statement_minimum_due,
  ls.updated_balance,
  -- Deferment information
  ad.deferred_month_year,
  ad.decide_by_date,
  ad.loss_date,
  ad.deferment_reason,
  ad.deferment_created_at,
  true as is_deferred_active,
  -- Calculate next due date for display purposes (skip deferred month)
  CASE 
    WHEN b.due_date IS NOT NULL THEN b.due_date::DATE
    WHEN b.due_day IS NOT NULL THEN 
      CASE 
        -- If deferred_month_year matches current month, calculate for next month
        WHEN ad.deferred_month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN
          make_date(
            EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
            EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
            LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month - 1 day'))::int)
          )
        -- Otherwise use current month
        ELSE
          make_date(
            EXTRACT(YEAR FROM CURRENT_DATE)::int,
            EXTRACT(MONTH FROM CURRENT_DATE)::int,
            LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
          )
      END
    ELSE NULL
  END as next_due_date,
  -- Calculate if overdue (for informational purposes)
  CASE 
    WHEN b.due_date IS NOT NULL THEN 
      b.due_date::DATE < CURRENT_DATE
    WHEN b.due_day IS NOT NULL THEN 
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        EXTRACT(MONTH FROM CURRENT_DATE)::int,
        LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
      ) < CURRENT_DATE
    ELSE false
  END as is_overdue
FROM bills b
INNER JOIN active_deferments ad ON b.id = ad.bill_id
LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
LEFT JOIN latest_statements ls ON b.id = ls.bill_id
WHERE b.user_id = auth.uid()
ORDER BY ad.decide_by_date ASC NULLS LAST, b.name ASC;

-- Grant access to authenticated users
GRANT SELECT ON deferred_bills_view TO authenticated;

-- Add helpful comment
COMMENT ON VIEW deferred_bills_view IS 'Returns all bills with active deferments (is_active = true). No date range filtering. Ordered by decide_by_date (nulls last) then name.';
