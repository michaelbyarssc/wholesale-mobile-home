-- Drop the existing materialized views that are causing security warnings
DROP MATERIALIZED VIEW IF EXISTS analytics_overview_mv;
DROP MATERIALIZED VIEW IF EXISTS analytics_popular_pages_mv;
DROP MATERIALIZED VIEW IF EXISTS analytics_mobile_homes_mv;

-- Create security definer functions instead that respect RLS
CREATE OR REPLACE FUNCTION get_analytics_overview()
RETURNS TABLE (
  total_sessions bigint,
  unique_users bigint,
  avg_session_duration integer,
  total_estimates bigint,
  total_appointments bigint,
  total_sales bigint,
  avg_sale_value numeric,
  total_pageviews bigint,
  unique_pageviews bigint,
  avg_time_on_page numeric,
  total_views bigint,
  avg_view_time numeric,
  homes_viewed bigint,
  period_start timestamp with time zone,
  period_end timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamp with time zone;
  end_date timestamp with time zone;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  start_date := date_trunc('day', now()) - interval '30 days';
  end_date := date_trunc('day', now());

  RETURN QUERY
  WITH session_metrics AS (
    SELECT
      COUNT(DISTINCT session_id) as total_sessions,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(duration_seconds)::integer as avg_session_duration
    FROM analytics_sessions
    WHERE created_at >= start_date
  ),
  conversion_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE funnel_step = 'estimate_submit') as total_estimates,
      COUNT(*) FILTER (WHERE funnel_step = 'appointment_book') as total_appointments,
      COUNT(*) FILTER (WHERE funnel_step = 'sale_complete') as total_sales,
      ROUND(AVG(value) FILTER (WHERE funnel_step = 'sale_complete')::numeric, 2) as avg_sale_value
    FROM analytics_conversions
    WHERE created_at >= start_date
  ),
  page_metrics AS (
    SELECT
      COUNT(*) as total_pageviews,
      COUNT(DISTINCT session_id) as unique_pageviews,
      ROUND(AVG(time_on_page)::numeric, 2) as avg_time_on_page
    FROM analytics_page_views
    WHERE created_at >= start_date
  ),
  mobile_home_metrics AS (
    SELECT
      COUNT(*) as total_views,
      ROUND(AVG(time_spent)::numeric, 2) as avg_view_time,
      COUNT(DISTINCT mobile_home_id) as homes_viewed
    FROM analytics_mobile_home_views
    WHERE created_at >= start_date
  )
  SELECT 
    session_metrics.total_sessions,
    session_metrics.unique_users,
    session_metrics.avg_session_duration,
    conversion_metrics.total_estimates,
    conversion_metrics.total_appointments,
    conversion_metrics.total_sales,
    conversion_metrics.avg_sale_value,
    page_metrics.total_pageviews,
    page_metrics.unique_pageviews,
    page_metrics.avg_time_on_page,
    mobile_home_metrics.total_views,
    mobile_home_metrics.avg_view_time,
    mobile_home_metrics.homes_viewed,
    start_date as period_start,
    end_date as period_end
  FROM session_metrics, conversion_metrics, page_metrics, mobile_home_metrics;
END;
$$;

-- Create function for popular pages analytics
CREATE OR REPLACE FUNCTION get_analytics_popular_pages()
RETURNS TABLE (
  page_path text,
  page_title text,
  views bigint,
  unique_views bigint,
  avg_time numeric,
  avg_scroll_depth numeric,
  unique_view_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH page_stats AS (
    SELECT 
      apv.page_path,
      apv.page_title,
      COUNT(*) as views,
      COUNT(DISTINCT session_id) as unique_views,
      ROUND(AVG(time_on_page)::numeric, 2) as avg_time,
      ROUND(AVG(scroll_depth)::numeric, 2) as avg_scroll_depth
    FROM analytics_page_views apv
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY apv.page_path, apv.page_title
  )
  SELECT 
    page_stats.page_path,
    page_stats.page_title,
    page_stats.views,
    page_stats.unique_views,
    page_stats.avg_time,
    page_stats.avg_scroll_depth,
    ROUND((page_stats.unique_views::float / page_stats.views * 100)::numeric, 2) as unique_view_rate
  FROM page_stats
  ORDER BY page_stats.views DESC;
END;
$$;

-- Create function for mobile homes analytics
CREATE OR REPLACE FUNCTION get_analytics_mobile_homes()
RETURNS TABLE (
  mobile_home_id uuid,
  model text,
  series text,
  manufacturer text,
  total_views bigint,
  unique_views bigint,
  avg_view_time numeric,
  estimate_requests bigint,
  appointments bigint,
  sales bigint,
  estimate_rate numeric,
  appointment_rate numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH mobile_home_stats AS (
    SELECT 
      mhv.mobile_home_id,
      mh.model,
      mh.series,
      mh.manufacturer,
      COUNT(*) as total_views,
      COUNT(DISTINCT mhv.session_id) as unique_views,
      ROUND(AVG(mhv.time_spent)::numeric, 2) as avg_view_time,
      COUNT(*) FILTER (WHERE ac.funnel_step = 'estimate_submit') as estimate_requests,
      COUNT(*) FILTER (WHERE ac.funnel_step = 'appointment_book') as appointments,
      COUNT(*) FILTER (WHERE ac.funnel_step = 'sale_complete') as sales
    FROM analytics_mobile_home_views mhv
    LEFT JOIN mobile_homes mh ON mhv.mobile_home_id = mh.id
    LEFT JOIN analytics_conversions ac ON ac.mobile_home_id = mhv.mobile_home_id 
      AND ac.created_at >= NOW() - INTERVAL '30 days'
    WHERE mhv.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY mhv.mobile_home_id, mh.model, mh.series, mh.manufacturer
  )
  SELECT 
    mobile_home_stats.mobile_home_id,
    mobile_home_stats.model,
    mobile_home_stats.series,
    mobile_home_stats.manufacturer,
    mobile_home_stats.total_views,
    mobile_home_stats.unique_views,
    mobile_home_stats.avg_view_time,
    mobile_home_stats.estimate_requests,
    mobile_home_stats.appointments,
    mobile_home_stats.sales,
    CASE WHEN mobile_home_stats.total_views > 0 THEN 
      ROUND((mobile_home_stats.estimate_requests::float / mobile_home_stats.total_views * 100)::numeric, 2)
    ELSE 0 END as estimate_rate,
    CASE WHEN mobile_home_stats.total_views > 0 THEN 
      ROUND((mobile_home_stats.appointments::float / mobile_home_stats.total_views * 100)::numeric, 2)
    ELSE 0 END as appointment_rate,
    CASE WHEN mobile_home_stats.total_views > 0 THEN 
      ROUND((mobile_home_stats.sales::float / mobile_home_stats.total_views * 100)::numeric, 2)
    ELSE 0 END as conversion_rate
  FROM mobile_home_stats
  ORDER BY mobile_home_stats.total_views DESC;
END;
$$;

-- Update the refresh_analytics_views function to work with the new functions
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Since we're using functions instead of materialized views,
  -- this function now just needs to exist for backward compatibility
  -- The data is computed in real-time by the functions
  NULL;
END;
$$;