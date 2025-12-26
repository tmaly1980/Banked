-- Function to generate daily income based on income rules
-- Returns a series of dates with their corresponding income amounts
-- Includes both projected income from rules and actual earnings from income_source_daily_earnings
CREATE OR REPLACE FUNCTION generate_daily_income(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  income_date DATE,
  amount NUMERIC,
  income_source_id UUID,
  income_source_name TEXT,
  is_actual BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    -- Generate series of dates
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE AS date
  ),
  projected_income AS (
    -- Calculate projected income from rules
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
  latest_projected AS (
    -- For each date/source combo, pick the rule with the latest created_at (most recent rule wins)
    SELECT DISTINCT ON (pi.date, pi.income_source_id)
      pi.date,
      pi.rule_amount,
      pi.income_source_id,
      pi.income_source_name
    FROM projected_income pi
    ORDER BY pi.date, pi.income_source_id, pi.created_at DESC
  ),
  actual_earnings AS (
    -- Get actual earnings from income_source_daily_earnings
    SELECT
      isde.date,
      isde.earnings_amount,
      isde.income_source_id,
      ins.name AS income_source_name
    FROM income_source_daily_earnings isde
    INNER JOIN income_sources ins ON isde.income_source_id = ins.id
    WHERE isde.user_id = p_user_id
      AND isde.date >= p_start_date
      AND isde.date <= p_end_date
  ),
  combined_income AS (
    -- Use actual earnings if they exist, otherwise use projected
    SELECT
      COALESCE(ae.date, lp.date) AS income_date,
      COALESCE(ae.earnings_amount, lp.rule_amount) AS amount,
      COALESCE(ae.income_source_id, lp.income_source_id) AS income_source_id,
      COALESCE(ae.income_source_name, lp.income_source_name) AS income_source_name,
      (ae.date IS NOT NULL) AS is_actual
    FROM latest_projected lp
    FULL OUTER JOIN actual_earnings ae 
      ON lp.date = ae.date AND lp.income_source_id = ae.income_source_id
  )
  SELECT 
    ci.income_date,
    ci.amount,
    ci.income_source_id,
    ci.income_source_name,
    ci.is_actual
  FROM combined_income ci
  ORDER BY ci.income_date, ci.income_source_name;
END;
$$ LANGUAGE plpgsql STABLE;
