-- Fix the search path security warning
CREATE OR REPLACE FUNCTION public.can_read_own_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id OR is_admin(auth.uid());
$$;