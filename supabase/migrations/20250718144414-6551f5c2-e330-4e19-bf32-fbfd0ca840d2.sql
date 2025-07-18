-- Temporarily add a direct user ID check for your account as a fallback
CREATE POLICY "Temp admin delete policy for troubleshooting"
ON public.estimates
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid()) OR 
  auth.uid() = '2cdfc4ae-d8cc-4890-a1be-132cfbdd87d0'::uuid OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);