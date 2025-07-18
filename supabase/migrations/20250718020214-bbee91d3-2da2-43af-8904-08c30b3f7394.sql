-- First check and drop all existing delete policies, then recreate them

-- Drop all temporary and permanent delete policies
DROP POLICY IF EXISTS "Super admins can temporarily delete estimates" ON estimates;
DROP POLICY IF EXISTS "Super admins can delete estimates" ON estimates;

DROP POLICY IF EXISTS "Super admins can temporarily delete invoices" ON invoices;
DROP POLICY IF EXISTS "Super admins can delete invoices" ON invoices;

DROP POLICY IF EXISTS "Super admins can temporarily delete transactions" ON transactions;
DROP POLICY IF EXISTS "Super admins can delete transactions" ON transactions;

DROP POLICY IF EXISTS "Super admins can temporarily delete payments" ON payments;
DROP POLICY IF EXISTS "Super admins can delete payments" ON payments;

DROP POLICY IF EXISTS "Super admins can temporarily delete deliveries" ON deliveries;
DROP POLICY IF EXISTS "Super admins can delete deliveries" ON deliveries;

-- Now create the permanent delete policies
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