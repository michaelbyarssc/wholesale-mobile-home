-- Clean up and create a single, proper is_admin function
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = COALESCE($1, auth.uid())
    AND user_roles.role IN ('admin', 'super_admin')
  )
$$;