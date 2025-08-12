-- Restrict public read access to app_settings and require authentication for SELECTs
-- 1) Ensure RLS is enabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 2) Remove public read policy
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- 3) Allow only authenticated users to read app settings
CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Keep existing admin manage policy (ALL) as-is so admins can continue to manage settings
