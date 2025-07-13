-- Remove the problematic policy that references auth.users table
DROP POLICY IF EXISTS "view_own_invoices" ON invoices;
DROP POLICY IF EXISTS "admin_view_invoices" ON invoices;

-- Keep only the clean policies we created
-- The existing policies should now be:
-- 1. "Super admins can manage all invoices" 
-- 2. "Users can view their own invoices"