-- Fix the type issue in get_analytics_overview function
DROP FUNCTION IF EXISTS public.get_analytics_overview;

CREATE OR REPLACE FUNCTION get_analytics_overview(
  p_start_date TEXT, 
  p_end_date TEXT
)
RETURNS TABLE (
  last_refresh TIMESTAMP WITH TIME ZONE,
  total_sessions BIGINT,
  unique_session_ids BIGINT,
  unique_users BIGINT,
  avg_session_duration NUMERIC,
  total_estimates BIGINT,
  total_appointments BIGINT,
  total_sales BIGINT,
  avg_sale_value NUMERIC,
  total_pageviews BIGINT,
  unique_pageviews BIGINT,
  avg_time_on_page NUMERIC,
  total_views BIGINT,
  avg_view_time NUMERIC,
  homes_viewed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY 
  SELECT
    now() as last_refresh,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT s.session_id) as unique_session_ids,
    -- Fix the type mismatch by casting both sides to text before COALESCE
    COUNT(DISTINCT COALESCE(s.user_id::text, s.session_id)) as unique_users,
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
  LEFT JOIN estimates e ON e.user_id = s.user_id 
    AND e.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND e.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE
  LEFT JOIN appointments a ON a.user_id = s.user_id 
    AND a.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND a.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE
  LEFT JOIN transactions t ON t.status = 'completed' AND t.user_id = s.user_id 
    AND t.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND t.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE
  LEFT JOIN analytics_page_views pv ON pv.session_id = s.id 
    AND pv.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND pv.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE
  LEFT JOIN analytics_mobile_home_views mhv ON mhv.session_id = s.id 
    AND mhv.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND mhv.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE
  WHERE 
    s.created_at >= (p_start_date)::TIMESTAMP WITH TIME ZONE
    AND s.created_at <= (p_end_date)::TIMESTAMP WITH TIME ZONE;
END;
$$;