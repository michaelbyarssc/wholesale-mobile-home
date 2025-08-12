-- 1) Helper function to safely get current user email without directly querying auth.users in policies
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 2) Harden appointments RLS to use current_user_email() and avoid direct subqueries to auth.users
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
USING (
  auth.uid() = user_id
  OR customer_email = public.current_user_email()
);

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (
  auth.uid() = user_id
  OR customer_email = public.current_user_email()
)
WITH CHECK (
  auth.uid() = user_id
  OR customer_email = public.current_user_email()
);

-- 3) Ensure analytics_sessions allows inserts/updates for anonymous and authenticated clients as intended
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert session data" ON public.analytics_sessions;
CREATE POLICY "Anyone can insert session data"
ON public.analytics_sessions
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update session data" ON public.analytics_sessions;
CREATE POLICY "Anyone can update session data"
ON public.analytics_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4) Lock down anonymous_chat_users to guarantee no accidental public reads
ALTER TABLE public.anonymous_chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_chat_users FORCE ROW LEVEL SECURITY;