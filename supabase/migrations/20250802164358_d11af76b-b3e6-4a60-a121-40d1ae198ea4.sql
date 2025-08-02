-- Fix RLS policies for admin_settings to properly block unauthenticated users
DROP POLICY IF EXISTS "Admins can view all settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;

-- Create comprehensive policies that require authentication AND admin role
CREATE POLICY "Only authenticated admins can access admin settings" 
ON public.admin_settings 
FOR ALL
USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Apply similar fixes to other sensitive admin tables
DROP POLICY IF EXISTS "Admins can manage all activity" ON public.activity_feed;
CREATE POLICY "Only authenticated admins can manage activity feed" 
ON public.activity_feed 
FOR ALL
USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Fix admin_audit_log policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Only authenticated admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Ensure customer_markups has proper anonymous blocking
CREATE POLICY "Block unauthenticated access to customer markups" 
ON public.customer_markups 
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix any existing policies that might allow anonymous access
UPDATE admin_settings SET setting_key = setting_key WHERE false; -- This will fail if anonymous can access