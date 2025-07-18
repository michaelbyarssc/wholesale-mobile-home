-- Add temporary DELETE policies for super admins (expires in 1 hour)
-- Current time + 1 hour = the expiry time

-- For estimates table - temporary delete policy
DROP POLICY IF EXISTS "Super admins can temporarily delete estimates" ON estimates;
CREATE POLICY "Super admins can temporarily delete estimates"
ON estimates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  AND now() < '2025-01-18 02:50:00+00'::timestamptz
);

-- For invoices table - temporary delete policy  
DROP POLICY IF EXISTS "Super admins can temporarily delete invoices" ON invoices;
CREATE POLICY "Super admins can temporarily delete invoices"
ON invoices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  AND now() < '2025-01-18 02:50:00+00'::timestamptz
);

-- Also ensure we can delete related transactions temporarily
DROP POLICY IF EXISTS "Super admins can temporarily delete transactions" ON transactions;
CREATE POLICY "Super admins can temporarily delete transactions"
ON transactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  AND now() < '2025-01-18 02:50:00+00'::timestamptz
);