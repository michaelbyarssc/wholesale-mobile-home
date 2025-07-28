-- Fix the generate_driver_session_token function to have immutable search_path
CREATE OR REPLACE FUNCTION public.generate_driver_session_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'drv_' || replace(gen_random_uuid()::text, '-', '');
END;
$function$;