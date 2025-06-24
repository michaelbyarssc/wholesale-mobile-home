
-- Fix the is_admin function to have a fixed search_path
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
      AND role = 'admin'
  );
$function$;

-- Fix the is_admin function without parameters to have a fixed search_path
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    -- Function logic here
    RETURN (SELECT EXISTS(SELECT 1 FROM auth.users WHERE role = 'admin' AND id = (SELECT auth.uid())));
END;
$function$
