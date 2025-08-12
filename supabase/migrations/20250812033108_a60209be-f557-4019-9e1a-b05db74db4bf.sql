-- Ensure RLS is enabled and enforced on anonymous_chat_users
ALTER TABLE public.anonymous_chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_chat_users FORCE ROW LEVEL SECURITY;

-- Allow only the current anonymous session (by chat token) to view its own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'anonymous_chat_users' 
      AND policyname = 'Anonymous visitors can view their own anonymous chat user'
  ) THEN
    CREATE POLICY "Anonymous visitors can view their own anonymous chat user"
    ON public.anonymous_chat_users
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.chat_sessions cs
        WHERE cs.id = anonymous_chat_users.session_id
          AND cs.session_token = public.get_request_header('x-chat-token')
          AND cs.status = 'active'
      )
    );
  END IF;
END
$$;