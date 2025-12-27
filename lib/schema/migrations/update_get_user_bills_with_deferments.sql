-- Update get_user_bills_v2 to include active deferment information
-- This allows bills to show deferred_until_date, loss_date, and deferment reason

CREATE OR REPLACE VIEW user_bills_view AS
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
    AND bd.is_active = false -- Only include inactive/historical deferments
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
),
bill_instances AS (
  -- One-time bills - single instance
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
    b.due_date::DATE as instance_due_date,
    'one_time' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  LEFT JOIN bill_deferments_agg bd ON b.id = bd.bill_id
  LEFT JOIN active_deferments ad ON b.id = ad.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_date IS NOT NULL

  UNION ALL

  -- Recurring bills - upcoming instance (next month)
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
    0 as current_period_paid,
    ls.statement_date,
    ls.statement_balance,
    ls.statement_minimum_due,
    ls.updated_balance,
    bd.deferred_months,
    ad.active_deferred_months,
    ad.decide_by_dates,
    ad.loss_dates,
    make_date(
      EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
      EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
      LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month - 1 day'))::int)
    ) as instance_due_date,
    'upcoming' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  LEFT JOIN bill_deferments_agg bd ON b.id = bd.bill_id
  LEFT JOIN active_deferments ad ON b.id = ad.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_day IS NOT NULL
    AND (b.start_month_year IS NULL OR b.start_month_year <= TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'))
    AND (b.end_month_year IS NULL OR b.end_month_year >= TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'))

  UNION ALL

  -- Undated bills (no due_date and no due_day)
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
    NULL as current_period_paid,
    ls.statement_date,
    ls.statement_balance,
    ls.statement_minimum_due,
    ls.updated_balance,
    bd.deferred_months,
    ad.active_deferred_months,
    ad.decide_by_dates,
    ad.loss_dates,
    NULL as instance_due_date,
    'undated' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  LEFT JOIN bill_deferments_agg bd ON b.id = bd.bill_id
  LEFT JOIN active_deferments ad ON b.id = ad.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_date IS NULL
    AND b.due_day IS NULL
)
SELECT
  bi.id,
  bi.user_id,
  bi.name,
  bi.amount,
  bi.due_date,
  bi.due_day,
  bi.priority,
  bi.loss_risk_flag,
  bi.is_variable,
  bi.urgent_note,
  bi.category_id,
  bi.notes,
  bi.start_month_year,
  bi.end_month_year,
  bi.created_at,
  bi.updated_at,
  bi.last_payment_date,
  bi.total_paid,
  bi.statement_date,
  bi.statement_balance,
  bi.statement_minimum_due,
  bi.updated_balance,
  bi.deferred_months,
  bi.active_deferred_months,
  bi.decide_by_dates,
  bi.loss_dates,
  bi.instance_due_date as next_due_date,
  CASE 
    WHEN bi.instance_due_date IS NULL THEN NULL
    ELSE (bi.instance_due_date - CURRENT_DATE)
  END as days_until_due,
  CASE 
    WHEN bi.instance_due_date IS NULL THEN false
    WHEN bi.instance_due_date < CURRENT_DATE THEN true
    ELSE false
  END as is_overdue,
  CASE
    WHEN bi.instance_due_date >= CURRENT_DATE THEN true
    ELSE false
  END as is_upcoming,
  -- Current period payment tracking
  bi.amount as total_amount,
  COALESCE(bi.current_period_paid, 0) as partial_payment,
  CASE 
    WHEN bi.amount IS NOT NULL THEN 
      GREATEST(0, bi.amount - COALESCE(bi.current_period_paid, 0))
    ELSE NULL
  END as remaining_amount
FROM bill_instances bi;

-- Create function to get user bills (wrapper around view)
CREATE OR REPLACE FUNCTION get_user_bills_v2()
RETURNS SETOF user_bills_view
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT * FROM user_bills_view
  ORDER BY 
    CASE 
      WHEN is_overdue THEN 0
      WHEN next_due_date IS NULL THEN 2
      ELSE 1
    END,
    next_due_date NULLS LAST,
    name;
$$;
