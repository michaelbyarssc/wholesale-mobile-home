-- Comprehensive cleanup and fix for deliveries table RLS policies
-- This addresses the infinite recursion error by removing all conflicting policies
-- and creating simple, non-overlapping policies

-- First, disable RLS temporarily to ensure we can make changes
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on deliveries table with CASCADE to ensure complete removal
-- We'll handle errors gracefully if policies don't exist
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies on deliveries table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'deliveries' AND schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.deliveries CASCADE', policy_record.policyname);
            RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop policy %, continuing: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Also try to drop any known problematic policies explicitly
DROP POLICY IF EXISTS "Admins can access all deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Drivers can view assigned deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "System can create deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Users can view their deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Drivers can update delivery status" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Super admins can manage all deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Admins can manage deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Drivers can manage assigned deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "System can manage deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Customers can view their deliveries" ON public.deliveries CASCADE;
DROP POLICY IF EXISTS "Allow admin access to deliveries" ON public.deliveries CASCADE;

-- Re-enable RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Create three simple, non-conflicting policies

-- 1. Admin Policy - Admins can do everything (most permissive, checked first)
CREATE POLICY "admin_full_access" ON public.deliveries
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Driver Policy - Drivers can view and update their assigned deliveries
CREATE POLICY "driver_assigned_access" ON public.deliveries
FOR SELECT
TO authenticated
USING (
    NOT is_admin(auth.uid()) AND 
    is_driver_for_delivery(auth.uid(), id)
);

CREATE POLICY "driver_update_assigned" ON public.deliveries
FOR UPDATE
TO authenticated
USING (
    NOT is_admin(auth.uid()) AND 
    is_driver_for_delivery(auth.uid(), id)
)
WITH CHECK (
    NOT is_admin(auth.uid()) AND 
    is_driver_for_delivery(auth.uid(), id)
);

-- 3. System Policy - Allow system operations for creating deliveries
CREATE POLICY "system_operations" ON public.deliveries
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;