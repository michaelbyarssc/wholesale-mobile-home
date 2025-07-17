-- Update the analytics_overview_mv materialized view to correctly count unique users
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics_overview_mv;
  REFRESH MATERIALIZED VIEW analytics_popular_pages_mv;
  REFRESH MATERIALIZED VIEW analytics_mobile_homes_mv;
END;
$$;

-- Drop and recreate the analytics_overview_mv with proper unique user count
DROP MATERIALIZED VIEW IF EXISTS analytics_overview_mv;

CREATE MATERIALIZED VIEW analytics_overview_mv AS
SELECT
  now() as last_refresh,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT s.session_id) as unique_session_ids,
  -- Count unique users - if no user_id, count unique sessions as separate users
  (
    SELECT COUNT(*) FROM (
      SELECT user_id FROM analytics_sessions 
      WHERE user_id IS NOT NULL AND created_at >= now() - interval '30 days'
      UNION 
      SELECT id FROM analytics_sessions
      WHERE user_id IS NULL AND created_at >= now() - interval '30 days'
    ) AS unique_users
  ) as unique_users,
  COALESCE(AVG(s.duration_seconds), 0) as avg_session_duration,
  COUNT(DISTINCT e.id) as total_estimates,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT t.id) as total_sales,
  COALESCE(AVG(t.total_amount), 0) as avg_sale_value,
  COUNT(DISTINCT pv.id) as total_pageviews,
  COUNT(DISTINCT pv.page_path) as unique_pageviews,
  COALESCE(AVG(pv.time_on_page), 0) as avg_time_on_page,
  COUNT(DISTINCT mhv.id) as total_views,
  COALESCE(AVG(mhv.time_spent), 0) as avg_view_time,
  COUNT(DISTINCT mhv.mobile_home_id) as homes_viewed
FROM
  analytics_sessions s
LEFT JOIN estimates e ON e.user_id = s.user_id AND e.created_at >= now() - interval '30 days'
LEFT JOIN appointments a ON a.user_id = s.user_id AND a.created_at >= now() - interval '30 days'
LEFT JOIN transactions t ON t.status = 'completed' AND t.user_id = s.user_id AND t.created_at >= now() - interval '30 days'
LEFT JOIN analytics_page_views pv ON pv.session_id = s.id AND pv.created_at >= now() - interval '30 days'
LEFT JOIN analytics_mobile_home_views mhv ON mhv.session_id = s.id AND mhv.created_at >= now() - interval '30 days'
WHERE s.created_at >= now() - interval '30 days';

-- Execute refresh immediately after creating
SELECT refresh_analytics_views();