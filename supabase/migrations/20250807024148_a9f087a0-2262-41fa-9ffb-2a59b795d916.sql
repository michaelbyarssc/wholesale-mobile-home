-- Create a simple function to check if user can read their own profile
CREATE OR REPLACE FUNCTION public.can_read_own_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() = profile_user_id OR is_admin(auth.uid());
$$;

-- Update the profile SELECT policy to be more explicit
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (can_read_own_profile(user_id));