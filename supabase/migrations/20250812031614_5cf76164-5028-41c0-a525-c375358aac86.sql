-- Idempotent RLS hardening: ALTER existing policies or CREATE if missing

-- Helper: function-less DO blocks per table/policy

-- 2) Analytics policies: ensure owner-only SELECT (admins already have separate policies)

-- analytics_sessions
DO $$
BEGIN
  -- remove legacy policy name if present
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_sessions' AND policyname = 'Users can view their own sessions'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own sessions" ON public.analytics_sessions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_sessions' AND policyname = 'Users can view their own sessions only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own sessions only" ON public.analytics_sessions USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own sessions only" ON public.analytics_sessions FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- analytics_page_views
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_page_views' AND policyname = 'Users can view their own page views'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own page views" ON public.analytics_page_views';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_page_views' AND policyname = 'Users can view their own page views only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own page views only" ON public.analytics_page_views USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own page views only" ON public.analytics_page_views FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- analytics_conversions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_conversions' AND policyname = 'Users can view their own conversions'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own conversions" ON public.analytics_conversions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_conversions' AND policyname = 'Users can view their own conversions only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own conversions only" ON public.analytics_conversions USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own conversions only" ON public.analytics_conversions FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- analytics_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_events' AND policyname = 'Users can view their own events'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own events" ON public.analytics_events';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_events' AND policyname = 'Users can view their own events only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own events only" ON public.analytics_events USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own events only" ON public.analytics_events FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- analytics_mobile_home_views
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_mobile_home_views' AND policyname = 'Users can view their own mobile home views'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own mobile home views" ON public.analytics_mobile_home_views';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_mobile_home_views' AND policyname = 'Users can view their own mobile home views only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own mobile home views only" ON public.analytics_mobile_home_views USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own mobile home views only" ON public.analytics_mobile_home_views FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- analytics_searches
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_searches' AND policyname = 'Users can view their own searches'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own searches" ON public.analytics_searches';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'analytics_searches' AND policyname = 'Users can view their own searches only'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own searches only" ON public.analytics_searches USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    EXECUTE 'CREATE POLICY "Users can view their own searches only" ON public.analytics_searches FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)';
  END IF;
END $$;

-- 3) Business Intelligence: enforce admin-only SELECT

-- shipping_calculations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'shipping_calculations' AND policyname = 'Anyone can view shipping calculations'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view shipping calculations" ON public.shipping_calculations';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'shipping_calculations' AND policyname = 'Admins can view shipping calculations'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view shipping calculations" ON public.shipping_calculations USING (is_admin(auth.uid()))';
  ELSE
    EXECUTE 'CREATE POLICY "Admins can view shipping calculations" ON public.shipping_calculations FOR SELECT USING (is_admin(auth.uid()))';
  END IF;
END $$;

-- factories
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'factories' AND policyname = 'Anyone can view factories'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view factories" ON public.factories';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'factories' AND policyname = 'Admins can view factories'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view factories" ON public.factories USING (is_admin(auth.uid()))';
  ELSE
    EXECUTE 'CREATE POLICY "Admins can view factories" ON public.factories FOR SELECT USING (is_admin(auth.uid()))';
  END IF;
END $$;

-- mobile_home_factories
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mobile_home_factories' AND policyname = 'Anyone can view mobile home factory assignments'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view mobile home factory assignments" ON public.mobile_home_factories';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mobile_home_factories' AND policyname = 'Admins can view mobile home factory assignments'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view mobile home factory assignments" ON public.mobile_home_factories USING (is_admin(auth.uid()))';
  ELSE
    EXECUTE 'CREATE POLICY "Admins can view mobile home factory assignments" ON public.mobile_home_factories FOR SELECT USING (is_admin(auth.uid()))';
  END IF;
END $$;

-- transaction_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'transaction_settings' AND policyname = 'Users can view transaction settings'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view transaction settings" ON public.transaction_settings';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'transaction_settings' AND policyname = 'Admins can view transaction settings'
  ) THEN
    EXECUTE 'ALTER POLICY "Admins can view transaction settings" ON public.transaction_settings USING (is_admin(auth.uid()))';
  ELSE
    EXECUTE 'CREATE POLICY "Admins can view transaction settings" ON public.transaction_settings FOR SELECT USING (is_admin(auth.uid()))';
  END IF;
END $$;