-- Extend delete policies for another hour
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
  AND now() < '2025-01-18 03:50:00+00'::timestamptz
);

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
  AND now() < '2025-01-18 03:50:00+00'::timestamptz
);

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
  AND now() < '2025-01-18 03:50:00+00'::timestamptz
);

-- Also add policy for payments if they exist
DROP POLICY IF EXISTS "Super admins can temporarily delete payments" ON payments;
CREATE POLICY "Super admins can temporarily delete payments"
ON payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  AND now() < '2025-01-18 03:50:00+00'::timestamptz
);

-- Add policy for deliveries as well
DROP POLICY IF EXISTS "Super admins can temporarily delete deliveries" ON deliveries;
CREATE POLICY "Super admins can temporarily delete deliveries"
ON deliveries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  AND now() < '2025-01-18 03:50:00+00'::timestamptz
);