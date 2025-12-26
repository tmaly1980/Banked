-- UPDATED VIEW: Returns multiple instances per recurring bill
-- Shows BOTH overdue AND upcoming instances when a recurring bill is unpaid
-- For example: Mortgage due 12/15 (unpaid) will show:
--   - 12/15 instance (overdue)
--   - 1/15 instance (upcoming)

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
    b.deferred_flag,
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
    b.due_date::DATE as instance_due_date,
    'one_time' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_date IS NOT NULL

  UNION ALL

  -- Recurring bills - current/overdue instance (if unpaid)
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
    make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
    ) as instance_due_date,
    'current' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN current_period_payments cpp ON b.id = cpp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_day IS NOT NULL
    AND (b.start_month_year IS NULL OR b.start_month_year <= TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
    AND (b.end_month_year IS NULL OR b.end_month_year >= TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
    -- Only show current month if not fully paid OR if due date hasn't passed yet
    AND (COALESCE(cpp.current_period_paid, 0) < b.amount OR 
         make_date(
           EXTRACT(YEAR FROM CURRENT_DATE)::int,
           EXTRACT(MONTH FROM CURRENT_DATE)::int,
           LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
         ) >= CURRENT_DATE)

  UNION ALL

  -- Recurring bills - next month instance (upcoming)
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
    b.urgent_note,
    b.category_id,
    b.notes,
    b.start_month_year,
    b.end_month_year,
    b.created_at,
    b.updated_at,
    bp.last_payment_date,
    bp.total_paid,
    0 as current_period_paid, -- Next month has no payments yet
    ls.statement_date,
    ls.statement_balance,
    ls.statement_minimum_due,
    ls.updated_balance,
    make_date(
      EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
      EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
      LEAST(b.due_day, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month - 1 day'))::int)
    ) as instance_due_date,
    'upcoming' as instance_type
  FROM bills b
  LEFT JOIN bill_payment_summary bp ON b.id = bp.bill_id
  LEFT JOIN latest_statements ls ON b.id = ls.bill_id
  WHERE b.user_id = auth.uid()
    AND b.due_day IS NOT NULL
    AND (b.start_month_year IS NULL OR b.start_month_year <= TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'))
    AND (b.end_month_year IS NULL OR b.end_month_year >= TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'))
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
  bi.statement_date,
  bi.statement_balance,
  bi.statement_minimum_due,
  bi.updated_balance,
  bi.instance_due_date as next_due_date,
  CURRENT_DATE - bi.instance_due_date as days_until_due,
  bi.instance_due_date < CURRENT_DATE as is_overdue,
  bi.instance_due_date >= CURRENT_DATE as is_upcoming,
  bi.last_payment_date,
  COALESCE(bi.total_paid, 0) as total_paid,
  bi.amount as total_amount,
  COALESCE(bi.current_period_paid, 0) as partial_payment,
  CASE 
    WHEN COALESCE(bi.current_period_paid, 0) >= bi.amount THEN 0
    ELSE bi.amount - COALESCE(bi.current_period_paid, 0)
  END as remaining_amount
FROM bill_instances bi
ORDER BY 
  CASE WHEN bi.deferred_flag THEN 1 ELSE 0 END,
  CASE WHEN bi.instance_due_date IS NULL THEN 1 ELSE 0 END,
  bi.instance_due_date ASC,
  bi.priority DESC,
  bi.name ASC;

GRANT SELECT ON user_bills_view TO authenticated;
