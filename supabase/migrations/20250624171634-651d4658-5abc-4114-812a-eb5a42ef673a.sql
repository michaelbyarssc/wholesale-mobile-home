
-- Fix the validate_phone function to have a fixed search_path
CREATE OR REPLACE FUNCTION public.validate_phone(phone text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Remove all non-digits and check if it's a valid US phone number
  RETURN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[0-9]{10}$';
END;
$function$
