-- Fix profile RLS policy conflicts and session authentication issues

-- 1. Drop all existing conflicting SELECT policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;

-- 2. Create a single, clear SELECT policy that covers all access patterns
CREATE POLICY "Profile access policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR -- Users can see their own profile
  is_admin(auth.uid()) OR -- Admins can see all profiles
  created_by = auth.uid() -- Users can see profiles they created
);

-- 3. Also ensure the UPDATE policy is consistent
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any pro" ON public.profiles;
CREATE POLICY "Profile update policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR -- Users can update their own profile
  is_admin(auth.uid()) OR -- Admins can update any profile
  created_by = auth.uid() -- Users can update profiles they created
)
WITH CHECK (
  auth.uid() = user_id OR -- Users can update their own profile
  is_admin(auth.uid()) OR -- Admins can update any profile
  created_by = auth.uid() -- Users can update profiles they created
);