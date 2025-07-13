-- Check current RLS policies for invoices table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'invoices';

-- Drop existing problematic policies and recreate them
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;

-- Create simple, working RLS policies for invoices
CREATE POLICY "Super admins can manage all invoices" 
ON invoices 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Users can view their own invoices" 
ON invoices 
FOR SELECT 
USING (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;