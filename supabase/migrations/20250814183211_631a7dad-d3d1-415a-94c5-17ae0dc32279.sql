-- Fix analytics_sessions RLS policies to allow proper session creation
-- The current policies are conflicting and preventing anonymous session creation

-- Drop existing policies on analytics_sessions
DROP POLICY IF EXISTS "Allow anon insert analytics sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can insert session data" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can update session data" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow update analytics session by id filter" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions only" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Admins can read analytics sessions" ON public.analytics_sessions;

-- Create simple, non-conflicting policies for analytics_sessions

-- 1. Allow anyone (including anonymous) to insert sessions
CREATE POLICY "allow_insert_sessions" ON public.analytics_sessions
FOR INSERT
WITH CHECK (true);

-- 2. Allow anyone to update sessions (needed for ending sessions)
CREATE POLICY "allow_update_sessions" ON public.analytics_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. Allow users to view their own sessions, admins to view all
CREATE POLICY "allow_select_sessions" ON public.analytics_sessions
FOR SELECT
USING (
  auth.uid() IS NULL OR -- Allow anonymous reads
  auth.uid() = user_id OR -- Users can see their own
  is_admin(auth.uid()) -- Admins can see all
);