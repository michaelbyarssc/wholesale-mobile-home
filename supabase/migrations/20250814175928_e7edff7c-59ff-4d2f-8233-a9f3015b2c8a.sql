-- Fix infinite recursion in deliveries RLS policies
-- Drop all existing policies on deliveries table to start fresh
DROP POLICY IF EXISTS "Super admins can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Drivers can view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Drivers can view their assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "System can manage deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can manage deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries they created" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Drivers can update assigned deliveries" ON public.deliveries;

-- Create simple, non-conflicting policies for deliveries table

-- 1. Super admins and admins can do everything
CREATE POLICY "Admins can manage all deliveries" 
ON public.deliveries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 2. Drivers can view and update deliveries they are assigned to
CREATE POLICY "Drivers can access assigned deliveries" 
ON public.deliveries 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT dr.user_id 
    FROM drivers dr
    JOIN delivery_assignments da ON da.driver_id = dr.id
    WHERE da.delivery_id = deliveries.id AND da.active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT dr.user_id 
    FROM drivers dr
    JOIN delivery_assignments da ON da.driver_id = dr.id
    WHERE da.delivery_id = deliveries.id AND da.active = true
  )
);

-- 3. System/service role can manage deliveries for automated processes
CREATE POLICY "System can manage deliveries" 
ON public.deliveries 
FOR ALL 
USING (true)
WITH CHECK (true);