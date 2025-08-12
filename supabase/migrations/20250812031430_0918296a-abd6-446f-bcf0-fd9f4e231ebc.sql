-- 1) Anonymous chat users: already restricted; no changes

-- 2) Analytics: tighten SELECT so anonymous rows are not publicly readable
-- analytics_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.analytics_sessions;
CREATE POLICY "Users can view their own sessions only"
  ON public.analytics_sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- analytics_page_views
DROP POLICY IF EXISTS "Users can view their own page views" ON public.analytics_page_views;
CREATE POLICY "Users can view their own page views only"
  ON public.analytics_page_views
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- analytics_conversions
DROP POLICY IF EXISTS "Users can view their own conversions" ON public.analytics_conversions;
CREATE POLICY "Users can view their own conversions only"
  ON public.analytics_conversions
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- analytics_events
DROP POLICY IF EXISTS "Users can view their own events" ON public.analytics_events;
CREATE POLICY "Users can view their own events only"
  ON public.analytics_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- analytics_mobile_home_views
DROP POLICY IF EXISTS "Users can view their own mobile home views" ON public.analytics_mobile_home_views;
CREATE POLICY "Users can view their own mobile home views only"
  ON public.analytics_mobile_home_views
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- analytics_searches
DROP POLICY IF EXISTS "Users can view their own searches" ON public.analytics_searches;
CREATE POLICY "Users can view their own searches only"
  ON public.analytics_searches
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Note: We intentionally keep existing INSERT policies (public ingestion) and admin SELECT policies

-- 3) Business Intelligence: remove public SELECT and restrict to admins

-- shipping_calculations
DROP POLICY IF EXISTS "Anyone can view shipping calculations" ON public.shipping_calculations;
CREATE POLICY "Admins can view shipping calculations"
  ON public.shipping_calculations
  FOR SELECT
  USING (is_admin(auth.uid()));

-- factories
DROP POLICY IF EXISTS "Anyone can view factories" ON public.factories;
CREATE POLICY "Admins can view factories"
  ON public.factories
  FOR SELECT
  USING (is_admin(auth.uid()));

-- mobile_home_factories
DROP POLICY IF EXISTS "Anyone can view mobile home factory assignments" ON public.mobile_home_factories;
CREATE POLICY "Admins can view mobile home factory assignments"
  ON public.mobile_home_factories
  FOR SELECT
  USING (is_admin(auth.uid()));

-- transaction_settings
DROP POLICY IF EXISTS "Users can view transaction settings" ON public.transaction_settings;
CREATE POLICY "Admins can view transaction settings"
  ON public.transaction_settings
  FOR SELECT
  USING (is_admin(auth.uid()));