-- Create analytics tracking tables for user behavior insights

-- Table for tracking user sessions
CREATE TABLE public.analytics_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_views INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking page views
CREATE TABLE public.analytics_page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  search_query TEXT,
  filters_applied JSONB DEFAULT '{}',
  time_on_page INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking mobile home interactions
CREATE TABLE public.analytics_mobile_home_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mobile_home_id UUID REFERENCES mobile_homes(id) ON DELETE CASCADE NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('list', 'detail', 'gallery', 'comparison')),
  time_spent INTEGER DEFAULT 0,
  images_viewed INTEGER DEFAULT 0,
  features_clicked JSONB DEFAULT '[]',
  price_checked BOOLEAN DEFAULT false,
  contact_clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking user interactions/events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page_path TEXT,
  element_id TEXT,
  element_text TEXT,
  properties JSONB DEFAULT '{}',
  value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking search queries and filters
CREATE TABLE public.analytics_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_query TEXT,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  result_clicked BOOLEAN DEFAULT false,
  clicked_position INTEGER,
  clicked_mobile_home_id UUID REFERENCES mobile_homes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking conversion funnel
CREATE TABLE public.analytics_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  funnel_step TEXT NOT NULL CHECK (funnel_step IN ('page_view', 'mobile_home_view', 'contact_click', 'estimate_start', 'estimate_submit', 'appointment_book')),
  mobile_home_id UUID REFERENCES mobile_homes(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX idx_analytics_sessions_started_at ON analytics_sessions(started_at);

CREATE INDEX idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX idx_analytics_page_views_user_id ON analytics_page_views(user_id);
CREATE INDEX idx_analytics_page_views_page_path ON analytics_page_views(page_path);
CREATE INDEX idx_analytics_page_views_created_at ON analytics_page_views(created_at);

CREATE INDEX idx_analytics_mobile_home_views_session_id ON analytics_mobile_home_views(session_id);
CREATE INDEX idx_analytics_mobile_home_views_mobile_home_id ON analytics_mobile_home_views(mobile_home_id);
CREATE INDEX idx_analytics_mobile_home_views_created_at ON analytics_mobile_home_views(created_at);

CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

CREATE INDEX idx_analytics_searches_session_id ON analytics_searches(session_id);
CREATE INDEX idx_analytics_searches_created_at ON analytics_searches(created_at);

CREATE INDEX idx_analytics_conversions_session_id ON analytics_conversions(session_id);
CREATE INDEX idx_analytics_conversions_funnel_step ON analytics_conversions(funnel_step);
CREATE INDEX idx_analytics_conversions_created_at ON analytics_conversions(created_at);

-- Enable Row Level Security
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_mobile_home_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_sessions
CREATE POLICY "Anyone can insert session data" ON analytics_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own sessions" ON analytics_sessions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all sessions" ON analytics_sessions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can update session data" ON analytics_sessions FOR UPDATE USING (true);

-- RLS Policies for analytics_page_views
CREATE POLICY "Anyone can insert page view data" ON analytics_page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own page views" ON analytics_page_views FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all page views" ON analytics_page_views FOR SELECT USING (is_admin(auth.uid()));

-- RLS Policies for analytics_mobile_home_views
CREATE POLICY "Anyone can insert mobile home view data" ON analytics_mobile_home_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own mobile home views" ON analytics_mobile_home_views FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all mobile home views" ON analytics_mobile_home_views FOR SELECT USING (is_admin(auth.uid()));

-- RLS Policies for analytics_events
CREATE POLICY "Anyone can insert event data" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own events" ON analytics_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all events" ON analytics_events FOR SELECT USING (is_admin(auth.uid()));

-- RLS Policies for analytics_searches
CREATE POLICY "Anyone can insert search data" ON analytics_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own searches" ON analytics_searches FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all searches" ON analytics_searches FOR SELECT USING (is_admin(auth.uid()));

-- RLS Policies for analytics_conversions
CREATE POLICY "Anyone can insert conversion data" ON analytics_conversions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own conversions" ON analytics_conversions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all conversions" ON analytics_conversions FOR SELECT USING (is_admin(auth.uid()));

-- Create a function to clean up old analytics data (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete old sessions (older than 1 year)
  DELETE FROM analytics_sessions 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old page views (older than 1 year)
  DELETE FROM analytics_page_views 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old mobile home views (older than 1 year)
  DELETE FROM analytics_mobile_home_views 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old events (older than 1 year)
  DELETE FROM analytics_events 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old searches (older than 1 year)
  DELETE FROM analytics_searches 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old conversions (older than 1 year)
  DELETE FROM analytics_conversions 
  WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$;

-- Create a function to get popular mobile homes
CREATE OR REPLACE FUNCTION get_popular_mobile_homes(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  mobile_home_id UUID,
  view_count BIGINT,
  total_time_spent BIGINT,
  avg_time_spent NUMERIC,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mhv.mobile_home_id,
    COUNT(*) as view_count,
    SUM(mhv.time_spent) as total_time_spent,
    AVG(mhv.time_spent) as avg_time_spent,
    COALESCE(
      (COUNT(c.id)::NUMERIC / COUNT(mhv.id)::NUMERIC) * 100, 
      0
    ) as conversion_rate
  FROM analytics_mobile_home_views mhv
  LEFT JOIN analytics_conversions c ON c.mobile_home_id = mhv.mobile_home_id 
    AND c.funnel_step IN ('estimate_submit', 'appointment_book')
    AND c.created_at >= now() - interval '1 day' * days_back
  WHERE mhv.created_at >= now() - interval '1 day' * days_back
  GROUP BY mhv.mobile_home_id
  ORDER BY view_count DESC, total_time_spent DESC
  LIMIT limit_count;
END;
$$;

-- Enable realtime for analytics tables
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_conversions;