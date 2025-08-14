-- Create a more robust admin access policy that works around auth.uid() issues
-- This adds an explicit policy for super admins that should work even when auth.uid() is null

-- Drop the problematic policy and recreate with better fallbacks
DROP POLICY IF EXISTS "Super admins can view all deliveries with explicit check" ON public.deliveries;

-- Add a temporary super permissive policy for super admins based on user roles table
CREATE POLICY "Emergency super admin access to deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  -- Check if the current session user ID matches a super admin in user_roles
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.role = 'super_admin'
    AND au.email = (SELECT auth.email())
  )
  OR
  -- Fallback: Check the function approach
  public.check_user_admin_access(auth.uid()) = true
  OR
  -- Additional fallback: Direct role check with session info
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);