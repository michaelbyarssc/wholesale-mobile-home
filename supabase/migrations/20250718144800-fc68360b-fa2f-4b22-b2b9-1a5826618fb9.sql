-- Fix the delete policy to avoid auth.users table access issues
DROP POLICY IF EXISTS "Comprehensive admin delete policy" ON public.estimates;

-- Create a simpler delete policy that works with RLS
CREATE POLICY "Admin delete policy - fixed"
ON public.estimates
FOR DELETE
TO authenticated
USING (
  -- Check if user has admin or super_admin role using user_id directly
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
  OR
  -- Fallback: direct user check for your specific account
  auth.uid() = '2cdfc4ae-d8cc-4890-a1be-132cfbdd87d0'::uuid
);