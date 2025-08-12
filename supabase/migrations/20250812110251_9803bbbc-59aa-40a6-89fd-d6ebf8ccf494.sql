
-- 1) Ensure RLS is enabled on analytics tables
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_mobile_home_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_conversions ENABLE ROW LEVEL SECURITY;

-- 2) Fix analytics_sessions RLS
-- Drop and recreate permissive policies for inserts/updates that do NOT expose PII
DROP POLICY IF EXISTS "Allow anon insert analytics sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow update analytics session by id filter" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Admins can read analytics sessions" ON public.analytics_sessions;

-- Allow anonymous and authenticated inserts for session bootstrapping
CREATE POLICY "Allow anon insert analytics sessions"
  ON public.analytics_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow updates when filtered by id=eq.<session_id> (matches client .eq('id', ...))
-- Uses helper public.get_query_eq_value('id') which is already present
CREATE POLICY "Allow update analytics session by id filter"
  ON public.analytics_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (id::text = public.get_query_eq_value('id'))
  WITH CHECK (id::text = public.get_query_eq_value('id'));

-- Admin-only reads for dashboards
CREATE POLICY "Admins can read analytics sessions"
  ON public.analytics_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3) Allow inserts on child analytics tables when a valid session exists

-- analytics_page_views
DROP POLICY IF EXISTS "Allow anon insert analytics_page_views with valid session" ON public.analytics_page_views;
DROP POLICY IF EXISTS "Admins can read analytics_page_views" ON public.analytics_page_views;

CREATE POLICY "Allow anon insert analytics_page_views with valid session"
  ON public.analytics_page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_sessions s
      WHERE s.id = analytics_page_views.session_id
    )
  );

-- Admin-only reads
CREATE POLICY "Admins can read analytics_page_views"
  ON public.analytics_page_views
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- analytics_events
DROP POLICY IF EXISTS "Allow anon insert analytics_events with valid session" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics_events" ON public.analytics_events;

CREATE POLICY "Allow anon insert analytics_events with valid session"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_sessions s
      WHERE s.id = analytics_events.session_id
    )
  );

CREATE POLICY "Admins can read analytics_events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- analytics_mobile_home_views
DROP POLICY IF EXISTS "Allow anon insert analytics_mobile_home_views with valid session" ON public.analytics_mobile_home_views;
DROP POLICY IF EXISTS "Allow public read of mobile home views" ON public.analytics_mobile_home_views;
DROP POLICY IF EXISTS "Admins can read analytics_mobile_home_views" ON public.analytics_mobile_home_views;

CREATE POLICY "Allow anon insert analytics_mobile_home_views with valid session"
  ON public.analytics_mobile_home_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_sessions s
      WHERE s.id = analytics_mobile_home_views.session_id
    )
  );

-- Public read allowed to power PopularHomes (no PII in this table)
CREATE POLICY "Allow public read of mobile home views"
  ON public.analytics_mobile_home_views
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- (Optional) Admin read is redundant because public read already allowed.

-- analytics_searches
DROP POLICY IF EXISTS "Allow anon insert analytics_searches with valid session" ON public.analytics_searches;
DROP POLICY IF EXISTS "Admins can read analytics_searches" ON public.analytics_searches;

CREATE POLICY "Allow anon insert analytics_searches with valid session"
  ON public.analytics_searches
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_sessions s
      WHERE s.id = analytics_searches.session_id
    )
  );

CREATE POLICY "Admins can read analytics_searches"
  ON public.analytics_searches
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- analytics_conversions
DROP POLICY IF EXISTS "Allow anon insert analytics_conversions with valid session" ON public.analytics_conversions;
DROP POLICY IF EXISTS "Admins can read analytics_conversions" ON public.analytics_conversions;

CREATE POLICY "Allow anon insert analytics_conversions with valid session"
  ON public.analytics_conversions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_sessions s
      WHERE s.id = analytics_conversions.session_id
    )
  );

CREATE POLICY "Admins can read analytics_conversions"
  ON public.analytics_conversions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
