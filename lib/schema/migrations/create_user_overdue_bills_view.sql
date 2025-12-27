-- Create view for overdue bills only
-- This view shows only the current/overdue instances of recurring bills
-- One-time bills don't appear here as they're in user_bills_view

CREATE OR REPLACE VIEW user_overdue_bills_view AS
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
bill_deferments_agg AS (
  SELECT 
    bd.bill_id,
    ARRAY_AGG(bd.month_year ORDER BY bd.month_year) as deferred_months
  FROM bill_deferments bd
  WHERE bd.user_id = auth.uid()
    AND bd.is_active = false
  GROUP BY bd.bill_id
),
active_deferments AS (
  SELECT 
    bd.bill_id,
    ARRAY_AGG(bd.month_year ORDER BY bd.month_year) as active_deferred_months,
    ARRAY_AGG(bd.decide_by_date ORDER BY bd.month_year) as decide_by_dates,
    ARRAY_AGG(bd.loss_date ORDER BY bd.month_year) as loss_dates
  FROM bill_deferments bd
  WHERE bd.user_id = auth.uid()
    AND bd.is_active = true
  GROUP BY bd.bill_id
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
  b.is_variable,
  b.urgent_note,
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
  bd.deferred_months,
  ad.active_deferred_months,
  ad.decide_by_dates,
  ad.loss_dates,
  make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int,
    LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
  ) as next_due_date,
  (make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int,
    LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
  ) - CURRENT_DATE) as days_until_due,
  make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int,
    LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
  ) < CURRENT_DATE as is_overdue,
  make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int,
    LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
  ) >= CURRENT_DATE as is_upcoming,
  b.amount as total_amount,
  COALESCE(cpp.current_period_paid, 0) as partial_payment,
  CASE 
    WHEN b.amount IS NOT NULL THEN 
      GREATEST(0, b.amount - COALESCE(cpp.current_period_paid, 0))
    ELSE NULL
  END as remaining_amount
FROM bills b
LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
LEFT JOIN latest_statements ls ON b.id = ls.bill_id
LEFT JOIN bill_deferments_agg bd ON b.id = bd.bill_id
LEFT JOIN active_deferments ad ON b.id = ad.bill_id
WHERE b.user_id = auth.uid()
  AND b.due_day IS NOT NULL
  AND (b.start_month_year IS NULL OR b.start_month_year <= TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
  AND (b.end_month_year IS NULL OR b.end_month_year >= TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
  AND (b.amount IS NULL OR COALESCE(cpp.current_period_paid, 0) < b.amount)
ORDER BY 
  CASE 
    WHEN make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
    ) < CURRENT_DATE THEN 0
    ELSE 1
  END,
  next_due_date,
  name;
