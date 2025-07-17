-- Create missing indexes for better analytics performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created_at ON analytics_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_mobile_home_views_created_at ON analytics_mobile_home_views(created_at);

-- Add unique indexes needed for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_overview_mv_refresh ON analytics_overview_mv (last_refresh);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_popular_pages_mv_path ON analytics_popular_pages_mv (page_path);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_mobile_homes_mv_id ON analytics_mobile_homes_mv (mobile_home_id);

-- Create materialized view for analytics overview
DROP MATERIALIZED VIEW IF EXISTS analytics_overview_mv;
CREATE MATERIALIZED VIEW analytics_overview_mv AS
WITH stats AS (
  SELECT
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COALESCE(AVG(duration_seconds), 0)::integer as avg_session_duration
  FROM analytics_sessions
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
conversions AS (
  SELECT
    COUNT(*) FILTER (WHERE funnel_step = 'estimate_submit') as total_estimates,
    COUNT(*) FILTER (WHERE funnel_step = 'appointment_book') as total_appointments,
    COUNT(*) FILTER (WHERE funnel_step = 'sale_complete') as total_sales,
    ROUND(AVG(value) FILTER (WHERE funnel_step = 'sale_complete')::numeric, 2) as avg_sale_value
  FROM analytics_conversions
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
pages AS (
  SELECT
    COUNT(*) as total_pageviews,
    COUNT(DISTINCT session_id) as unique_pageviews,
    ROUND(AVG(time_on_page)::numeric, 2) as avg_time_on_page
  FROM analytics_page_views
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
homes AS (
  SELECT
    COUNT(*) as total_views,
    ROUND(AVG(time_spent)::numeric, 2) as avg_view_time,
    COUNT(DISTINCT mobile_home_id) as homes_viewed
  FROM analytics_mobile_home_views
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  NOW() as last_refresh,
  stats.*,
  conversions.*,
  pages.*,
  homes.*
FROM stats, conversions, pages, homes;

-- Create popular pages materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics_popular_pages_mv;
CREATE MATERIALIZED VIEW analytics_popular_pages_mv AS
SELECT 
  page_path,
  page_title,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_views,
  ROUND(AVG(time_on_page)::numeric, 2) as avg_time,
  ROUND(AVG(scroll_depth)::numeric, 2) as avg_scroll_depth,
  ROUND((COUNT(DISTINCT session_id)::float / COUNT(*)::float * 100)::numeric, 2) as unique_view_rate
FROM analytics_page_views
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path, page_title
ORDER BY views DESC;

-- Create mobile homes analytics materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics_mobile_homes_mv;
CREATE MATERIALIZED VIEW analytics_mobile_homes_mv AS
WITH home_stats AS (
  SELECT
    mhv.mobile_home_id,
    mh.model,
    mh.series,
    mh.manufacturer,
    COUNT(*) as total_views,
    COUNT(DISTINCT mhv.session_id) as unique_views,
    ROUND(AVG(mhv.time_spent)::numeric, 2) as avg_view_time,
    COUNT(DISTINCT CASE WHEN ac.funnel_step = 'estimate_submit' THEN ac.session_id END) as estimate_requests,
    COUNT(DISTINCT CASE WHEN ac.funnel_step = 'appointment_book' THEN ac.session_id END) as appointments,
    COUNT(DISTINCT CASE WHEN ac.funnel_step = 'sale_complete' THEN ac.session_id END) as sales
  FROM analytics_mobile_home_views mhv
  LEFT JOIN mobile_homes mh ON mh.id = mhv.mobile_home_id
  LEFT JOIN analytics_conversions ac ON ac.mobile_home_id = mhv.mobile_home_id 
    AND ac.created_at >= NOW() - INTERVAL '30 days'
  WHERE mhv.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY mhv.mobile_home_id, mh.model, mh.series, mh.manufacturer
)
SELECT 
  *,
  ROUND((estimate_requests::float / NULLIF(unique_views, 0) * 100)::numeric, 2) as estimate_rate,
  ROUND((appointments::float / NULLIF(unique_views, 0) * 100)::numeric, 2) as appointment_rate,
  ROUND((sales::float / NULLIF(unique_views, 0) * 100)::numeric, 2) as conversion_rate
FROM home_stats
ORDER BY total_views DESC;