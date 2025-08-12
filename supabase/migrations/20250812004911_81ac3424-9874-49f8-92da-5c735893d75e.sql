-- Enable strong RLS on customer_tracking_sessions and allow access only by valid token or admin/owner

-- 1) Safe helper to read request query values (e.g., session_token)
CREATE OR REPLACE FUNCTION public.get_request_query(name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q text;
BEGIN
  q := current_setting('request.query.' || lower(name), true);
  IF q IS NULL OR q = '' THEN
    RETURN NULL;
  END IF;
  RETURN q;
END;
$$;

-- 2) Helper to extract EQ filter value from PostgREST query param (e.g., "eq.track_abc")
CREATE OR REPLACE FUNCTION public.get_query_eq_value(name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw text;
BEGIN
  raw := public.get_request_query(name);
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;
  IF position('eq.' in raw) = 1 THEN
    RETURN substring(raw from 4);
  END IF;
  RETURN raw;
END;
$$;

-- 3) Ensure RLS is enabled
ALTER TABLE public.customer_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- 4) Admins can manage all tracking sessions
DROP POLICY IF EXISTS "Admins can manage tracking sessions" ON public.customer_tracking_sessions;
CREATE POLICY "Admins can manage tracking sessions"
ON public.customer_tracking_sessions
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 5) View by valid tracking token or by authenticated owner via related order
DROP POLICY IF EXISTS "View by valid tracking token or owner" ON public.customer_tracking_sessions;
CREATE POLICY "View by valid tracking token or owner"
ON public.customer_tracking_sessions
FOR SELECT
USING (
  -- Match via header or query param token
  session_token = COALESCE(
    public.get_request_header('x-tracking-token'),
    public.get_query_eq_value('session_token'),
    public.get_query_eq_value('token'),
    public.get_query_eq_value('tracking')
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = customer_tracking_sessions.order_id
        AND (auth.uid() = o.user_id OR is_admin(auth.uid()))
    )
  )
);

-- 6) Allow updating last_viewed (and similar non-sensitive fields) with token
DROP POLICY IF EXISTS "Update with valid tracking token" ON public.customer_tracking_sessions;
CREATE POLICY "Update with valid tracking token"
ON public.customer_tracking_sessions
FOR UPDATE
USING (
  session_token = COALESCE(
    public.get_request_header('x-tracking-token'),
    public.get_query_eq_value('session_token'),
    public.get_query_eq_value('token'),
    public.get_query_eq_value('tracking')
  )
  OR is_admin(auth.uid())
)
WITH CHECK (
  session_token = COALESCE(
    public.get_request_header('x-tracking-token'),
    public.get_query_eq_value('session_token'),
    public.get_query_eq_value('token'),
    public.get_query_eq_value('tracking')
  )
  OR is_admin(auth.uid())
);
