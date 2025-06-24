
-- Fix the validate_password_complexity function to have a fixed search_path
CREATE OR REPLACE FUNCTION public.validate_password_complexity(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- At least 8 characters, contains uppercase, lowercase, and number
  RETURN length(password) >= 8 
    AND password ~ '[A-Z]' 
    AND password ~ '[a-z]' 
    AND password ~ '[0-9]';
END;
$function$
