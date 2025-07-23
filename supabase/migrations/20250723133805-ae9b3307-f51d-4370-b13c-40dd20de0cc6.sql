-- Create helper function to get admin accessible users
CREATE OR REPLACE FUNCTION public.get_admin_accessible_users(admin_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT admin_id AS user_id  -- Admin can access their own data
  UNION
  SELECT p.user_id  -- Admin can access their assigned users' data
  FROM profiles p
  WHERE p.assigned_admin_id = admin_id;
END;
$$;

-- Update estimates RLS policies for hierarchical access
DROP POLICY IF EXISTS "Admins can view all estimates" ON estimates;
DROP POLICY IF EXISTS "Admins can update all estimates" ON estimates;

-- Hierarchical admin access for estimates
CREATE POLICY "Admins can view assigned user estimates" ON estimates
FOR SELECT 
TO authenticated
USING (
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Admins can update assigned user estimates" ON estimates
FOR UPDATE 
TO authenticated
USING (
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Update invoices RLS policies for hierarchical access
DROP POLICY IF EXISTS "Super admins can manage all invoices" ON invoices;

-- Hierarchical admin access for invoices
CREATE POLICY "Admins can view assigned user invoices" ON invoices
FOR SELECT 
USING (
  user_id = auth.uid() OR  -- Users can view their own invoices
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR  -- Admins can view assigned users
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Admins can manage assigned user invoices" ON invoices
FOR ALL 
USING (
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  user_id IN (SELECT get_admin_accessible_users(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Update deliveries RLS policies for hierarchical access
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON deliveries;

-- Hierarchical admin access for deliveries
CREATE POLICY "Admins can view assigned user deliveries" ON deliveries
FOR SELECT 
USING (
  -- Super admins can see all
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) OR
  -- Drivers can see their assigned deliveries (preserve existing logic)
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers d ON da.driver_id = d.id
    WHERE da.delivery_id = deliveries.id AND d.created_by = auth.uid()
  ) OR
  -- Admins can see deliveries for their assigned users (through invoice->estimate->user relationship)
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN estimates e ON i.estimate_id = e.id
    WHERE i.id = deliveries.invoice_id 
    AND e.user_id IN (SELECT get_admin_accessible_users(auth.uid()))
  )
);

CREATE POLICY "Admins can manage assigned user deliveries" ON deliveries
FOR ALL 
USING (
  -- Super admins can manage all
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) OR
  -- Admins can manage deliveries for their assigned users
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN estimates e ON i.estimate_id = e.id
    WHERE i.id = deliveries.invoice_id 
    AND e.user_id IN (SELECT get_admin_accessible_users(auth.uid()))
  )
)
WITH CHECK (
  -- Super admins can create/update all
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) OR
  -- Admins can create/update deliveries for their assigned users
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN estimates e ON i.estimate_id = e.id
    WHERE i.id = deliveries.invoice_id 
    AND e.user_id IN (SELECT get_admin_accessible_users(auth.uid()))
  )
);