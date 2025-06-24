
-- Phase 1: Critical RLS Policy Implementation (Fixed)

-- 1. Add comprehensive RLS policies for admin_settings table (admin-only access)
CREATE POLICY "Admins can view all settings" 
  ON public.admin_settings 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert settings" 
  ON public.admin_settings 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update settings" 
  ON public.admin_settings 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete settings" 
  ON public.admin_settings 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. Fix customer_markups table policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view their own markup" ON public.customer_markups;
DROP POLICY IF EXISTS "Admins can view all customer markups" ON public.customer_markups;
DROP POLICY IF EXISTS "Admins can insert customer markups" ON public.customer_markups;
DROP POLICY IF EXISTS "Admins can update customer markups" ON public.customer_markups;
DROP POLICY IF EXISTS "Admins can delete customer markups" ON public.customer_markups;

CREATE POLICY "Users can view their own markup or admins can view all" 
  ON public.customer_markups 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert customer markups" 
  ON public.customer_markups 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update customer markups" 
  ON public.customer_markups 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete customer markups" 
  ON public.customer_markups 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Add missing DELETE policy for estimates table
CREATE POLICY "Admins can delete estimates" 
  ON public.estimates 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Add policies for user_roles table
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert user roles" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update user roles" 
  ON public.user_roles 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete user roles" 
  ON public.user_roles 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5. Tighten mobile_home_images policies (remove overly permissive write access)
DROP POLICY IF EXISTS "Allow insert mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow update mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow delete mobile home images" ON public.mobile_home_images;

CREATE POLICY "Admins can insert mobile home images" 
  ON public.mobile_home_images 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update mobile home images" 
  ON public.mobile_home_images 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete mobile home images" 
  ON public.mobile_home_images 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Restrict profiles table SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Add input validation functions for enhanced security
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove all non-digits and check if it's a valid US phone number
  RETURN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[0-9]{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add password complexity validation function
CREATE OR REPLACE FUNCTION public.validate_password_complexity(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- At least 8 characters, contains uppercase, lowercase, and number
  RETURN length(password) >= 8 
    AND password ~ '[A-Z]' 
    AND password ~ '[a-z]' 
    AND password ~ '[0-9]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add audit log table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
  ON public.admin_audit_log 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
  ON public.admin_audit_log 
  FOR INSERT 
  WITH CHECK (true);
