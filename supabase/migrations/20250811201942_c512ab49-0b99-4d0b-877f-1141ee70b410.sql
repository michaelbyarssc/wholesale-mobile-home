-- Helper to safely read request headers in RLS
CREATE OR REPLACE FUNCTION public.get_request_header(name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hdr text;
BEGIN
  -- Headers are lowercase in PostgREST; guard missing setting
  hdr := current_setting('request.headers.' || lower(name), true);
  IF hdr IS NULL OR hdr = '' THEN
    RETURN NULL;
  END IF;
  RETURN hdr;
END;
$$;

-- Tighten chat_sessions SELECT to require auth or matching session token via header
DROP POLICY IF EXISTS "Users can view their chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their chat sessions"
ON public.chat_sessions
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (auth.uid() = agent_id)
  OR (
    user_id IS NULL
    AND session_token IS NOT NULL
    AND session_token = public.get_request_header('x-chat-token')
  )
);

-- Note: Admins still have full access via existing admin policy; other policies unchanged to avoid breaking chat flow.