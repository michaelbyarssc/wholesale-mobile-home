-- Enable RLS on analytics materialized views
ALTER MATERIALIZED VIEW analytics_overview_mv ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW analytics_popular_pages_mv ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW analytics_mobile_homes_mv ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics materialized views - only admins can access
CREATE POLICY "Admins can view analytics overview"
ON analytics_overview_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view popular pages analytics"
ON analytics_popular_pages_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view mobile homes analytics"
ON analytics_mobile_homes_mv
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));