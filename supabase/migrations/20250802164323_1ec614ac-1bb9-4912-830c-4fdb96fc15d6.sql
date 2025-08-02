-- Fix RLS policies for admin_settings to properly block anonymous users
DROP POLICY IF EXISTS "Admins can view all settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;

-- Create comprehensive policies that explicitly handle anonymous users
CREATE POLICY "Block anonymous access to admin settings" 
ON public.admin_settings 
FOR ALL
TO anonymous
USING (false)
WITH CHECK (false);

CREATE POLICY "Only admins can access admin settings" 
ON public.admin_settings 
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Apply similar fixes to other sensitive admin tables
DROP POLICY IF EXISTS "Admins can manage all activity" ON public.activity_feed;
CREATE POLICY "Block anonymous access to activity feed" 
ON public.activity_feed 
FOR ALL
TO anonymous
USING (false)
WITH CHECK (false);

CREATE POLICY "Admins can manage all activity feed" 
ON public.activity_feed 
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Fix admin_audit_log policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Block anonymous access to audit logs" 
ON public.admin_audit_log 
FOR ALL
TO anonymous
USING (false)
WITH CHECK (false);

CREATE POLICY "Only admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Fix customer_markups policies for anonymous users
CREATE POLICY "Block anonymous access to customer markups" 
ON public.customer_markups 
FOR ALL
TO anonymous
USING (false)
WITH CHECK (false);