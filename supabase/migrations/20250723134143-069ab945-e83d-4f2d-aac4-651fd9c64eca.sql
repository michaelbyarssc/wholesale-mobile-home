-- Clean up broad admin policies on deliveries table that bypass hierarchical permissions

-- Drop the remaining broad admin policies that allow admins to see all deliveries
DROP POLICY IF EXISTS "Admins can manage deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can view their assigned deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON deliveries;

-- Verify the correct hierarchical policies remain:
-- 1. "Admins can view assigned user deliveries" - allows access through get_admin_accessible_users
-- 2. "Admins can manage assigned user deliveries" - allows management through get_admin_accessible_users  
-- 3. Super admin policies for full access
-- 4. Driver policies for assigned deliveries
-- 5. User policies for own deliveries

-- No new policies needed - the hierarchical ones from the previous migration should handle access correctly