
-- Fix the validate_email function to have a fixed search_path
CREATE OR REPLACE FUNCTION public.validate_email(email text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$function$
