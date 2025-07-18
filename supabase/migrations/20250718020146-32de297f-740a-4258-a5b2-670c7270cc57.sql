-- Remove time limits and create permanent delete policies for super admins

-- Permanent delete policy for estimates
DROP POLICY IF EXISTS "Super admins can temporarily delete estimates" ON estimates;
CREATE POLICY "Super admins can delete estimates"
ON estimates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Permanent delete policy for invoices
DROP POLICY IF EXISTS "Super admins can temporarily delete invoices" ON invoices;
CREATE POLICY "Super admins can delete invoices"
ON invoices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Permanent delete policy for transactions
DROP POLICY IF EXISTS "Super admins can temporarily delete transactions" ON transactions;
CREATE POLICY "Super admins can delete transactions"
ON transactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Permanent delete policy for payments
DROP POLICY IF EXISTS "Super admins can temporarily delete payments" ON payments;
CREATE POLICY "Super admins can delete payments"
ON payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Permanent delete policy for deliveries
DROP POLICY IF EXISTS "Super admins can temporarily delete deliveries" ON deliveries;
CREATE POLICY "Super admins can delete deliveries"
ON deliveries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);