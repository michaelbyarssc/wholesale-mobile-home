-- Create missing indexes for better analytics query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created_at ON analytics_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_mobile_home_views_created_at ON analytics_mobile_home_views(created_at);

-- Create analytics dashboard views for caching common calculations
CREATE OR REPLACE VIEW analytics_overview AS
WITH date_range AS (
  SELECT 
    date_trunc('day', now()) - interval '30 days' as start_date,
    date_trunc('day', now()) as end_date
),
session_metrics AS (
  SELECT
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(duration_seconds)::integer as avg_session_duration
  FROM analytics_sessions
  WHERE created_at >= (SELECT start_date FROM date_range)
),
conversion_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE funnel_step = 'estimate_submit') as total_estimates,
    COUNT(*) FILTER (WHERE funnel_step = 'appointment_book') as total_appointments,
    COUNT(*) FILTER (WHERE funnel_step = 'sale_complete') as total_sales,
    ROUND(AVG(value) FILTER (WHERE funnel_step = 'sale_complete')::numeric, 2) as avg_sale_value
  FROM analytics_conversions
  WHERE created_at >= (SELECT start_date FROM date_range)
),
page_metrics AS (
  SELECT
    COUNT(*) as total_pageviews,
    COUNT(DISTINCT session_id) as unique_pageviews,
    ROUND(AVG(time_on_page)::numeric, 2) as avg_time_on_page
  FROM analytics_page_views
  WHERE created_at >= (SELECT start_date FROM date_range)
),
mobile_home_metrics AS (
  SELECT
    COUNT(*) as total_views,
    ROUND(AVG(time_spent)::numeric, 2) as avg_view_time,
    COUNT(DISTINCT mobile_home_id) as homes_viewed
  FROM analytics_mobile_home_views
  WHERE created_at >= (SELECT start_date FROM date_range)
)
SELECT 
  session_metrics.*,
  conversion_metrics.*,
  page_metrics.*,
  mobile_home_metrics.*,
  (SELECT start_date FROM date_range) as period_start,
  (SELECT end_date FROM date_range) as period_end;

-- Create popular pages view
CREATE OR REPLACE VIEW analytics_popular_pages AS
WITH page_stats AS (
  SELECT 
    page_path,
    page_title,
    COUNT(*) as views,
    COUNT(DISTINCT session_id) as unique_views,
    ROUND(AVG(time_on_page)::numeric, 2) as avg_time,
    ROUND(AVG(scroll_depth)::numeric, 2) as avg_scroll_depth
  FROM analytics_page_views
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY page_path, page_title
)
SELECT *,
  ROUND((unique_views::float / views * 100)::numeric, 2) as unique_view_rate
FROM page_stats
ORDER BY views DESC;