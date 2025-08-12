-- Harden RLS for anonymous_chat_users without breaking chat flow

-- 1) Ensure RLS is enabled
ALTER TABLE public.anonymous_chat_users ENABLE ROW LEVEL SECURITY;

-- 2) Restrict UPDATE to admins only
DROP POLICY IF EXISTS "System can update anonymous chat users" ON public.anonymous_chat_users;
CREATE POLICY "Admins can update anonymous chat users"
ON public.anonymous_chat_users
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3) Restrict INSERT to rows tied to a valid chat session (still allows anon clients to create with session_id)
DROP POLICY IF EXISTS "System can insert anonymous chat users" ON public.anonymous_chat_users;
CREATE POLICY "Insert with valid session"
ON public.anonymous_chat_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = anonymous_chat_users.session_id
  )
);

-- Keep existing SELECT policies for admins/super_admin and assigned agents intact