-- Function to generate daily income based on income rules
-- Returns a series of dates with their corresponding income amounts
CREATE OR REPLACE FUNCTION generate_daily_income(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  income_date DATE,
  amount NUMERIC,
  income_source_id UUID,
  income_source_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    -- Generate series of dates
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE AS date
  ),
  applicable_rules AS (
    -- Find rules that apply to each date
    SELECT 
      ds.date,
      ir.id AS rule_id,
      ir.amount AS rule_amount,
      ir.frequency,
      ir.days_of_week,
      ir.income_source_id,
      ir.created_at,
      ins.name AS income_source_name
    FROM date_series ds
    CROSS JOIN income_rules ir
    INNER JOIN income_sources ins ON ir.income_source_id = ins.id
    WHERE ir.user_id = p_user_id
      AND ds.date >= ir.start_date
      AND (ir.end_date IS NULL OR ds.date <= ir.end_date)
      AND (
        -- Daily frequency: if days_of_week is null or empty, apply to all days
        -- Otherwise, check if day of week matches
        (ir.frequency = 'daily' AND (
          ir.days_of_week IS NULL 
          OR jsonb_array_length(ir.days_of_week) = 0
          OR ir.days_of_week @> to_jsonb(EXTRACT(DOW FROM ds.date)::int)
        ))
        OR
        -- Weekly frequency: check if day of week is in the array
        (ir.frequency = 'weekly' AND ir.days_of_week @> to_jsonb(EXTRACT(DOW FROM ds.date)::int))
        OR
        -- Monthly frequency: check if day of month matches (stored as first element in days_of_week)
        (ir.frequency = 'monthly' 
          AND ir.days_of_week IS NOT NULL 
          AND jsonb_array_length(ir.days_of_week) > 0
          AND (ir.days_of_week->0)::text::int = EXTRACT(DAY FROM ds.date)::int
        )
      )
  ),
  latest_rules AS (
    -- For each date, pick the rule with the latest created_at (most recent rule wins)
    SELECT DISTINCT ON (ar.date)
      ar.date,
      ar.rule_amount,
      ar.income_source_id,
      ar.income_source_name
    FROM applicable_rules ar
    ORDER BY ar.date, ar.created_at DESC
  )
  SELECT 
    lr.date AS income_date,
    lr.rule_amount AS amount,
    lr.income_source_id,
    lr.income_source_name
  FROM latest_rules lr
  ORDER BY lr.date;
END;
$$ LANGUAGE plpgsql STABLE;
