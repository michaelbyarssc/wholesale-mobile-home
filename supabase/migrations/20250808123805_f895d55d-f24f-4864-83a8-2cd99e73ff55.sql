-- Ensure is_admin treats super_admin as admin without dropping existing function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_id 
      AND ur.role IN ('admin', 'super_admin')
  );
$$;