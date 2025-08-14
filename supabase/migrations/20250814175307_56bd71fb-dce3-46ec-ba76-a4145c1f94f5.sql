-- Fix admin role checking for deliveries access
-- This creates a function that can be called with explicit user_id to bypass auth.uid() issues

CREATE OR REPLACE FUNCTION public.check_user_admin_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has admin or super_admin role
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_admin_access(uuid) TO authenticated;

-- Add a more permissive policy for super admins that uses explicit user ID check
DROP POLICY IF EXISTS "Super admins can view all deliveries with explicit check" ON public.deliveries;
CREATE POLICY "Super admins can view all deliveries with explicit check"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  public.check_user_admin_access(auth.uid()) = true
);

-- Ensure the policy is at the top of the policy list
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;