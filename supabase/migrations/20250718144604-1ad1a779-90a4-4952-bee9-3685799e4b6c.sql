-- Drop existing delete policies and create a comprehensive one
DROP POLICY IF EXISTS "Admins can delete estimates" ON public.estimates;
DROP POLICY IF EXISTS "Super admins can delete estimates" ON public.estimates;
DROP POLICY IF EXISTS "Temp admin delete policy for troubleshooting" ON public.estimates;

-- Create a single comprehensive delete policy
CREATE POLICY "Comprehensive admin delete policy"
ON public.estimates
FOR DELETE
TO authenticated
USING (
  -- Check if user has admin or super_admin role directly
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN auth.users au ON ur.user_id = au.id
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND ur.role IN ('admin', 'super_admin')
  )
  OR
  -- Fallback: check by email directly for your account
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'michaelbyarssc@gmail.com'
  )
);