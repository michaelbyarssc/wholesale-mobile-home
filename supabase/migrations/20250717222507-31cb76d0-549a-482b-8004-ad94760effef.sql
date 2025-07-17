-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics_overview_mv;
  REFRESH MATERIALIZED VIEW analytics_popular_pages_mv;
  REFRESH MATERIALIZED VIEW analytics_mobile_homes_mv;
END;
$$;

-- Create RLS policies for materialized views
ALTER MATERIALIZED VIEW analytics_overview_mv ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW analytics_popular_pages_mv ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW analytics_mobile_homes_mv ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics overview"
ON analytics_overview_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view popular pages"
ON analytics_popular_pages_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view mobile homes analytics"
ON analytics_mobile_homes_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Initial refresh
SELECT refresh_analytics_views();