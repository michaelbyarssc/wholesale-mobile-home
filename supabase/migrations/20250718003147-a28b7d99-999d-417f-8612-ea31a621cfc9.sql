-- Replace any functions that use gen_random_bytes with gen_random_uuid()
-- Let's check what's calling gen_random_bytes by looking at the delivery number generation

-- First, let's recreate the generate_delivery_number function to ensure it works
CREATE OR REPLACE FUNCTION public.generate_delivery_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'DEL-' || LPAD(nextval('delivery_number_seq')::TEXT, 6, '0');
END;
$$;

-- Update any tracking token generation functions that might use gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'track_' || replace(gen_random_uuid()::text, '-', '');
END;
$$;

-- Also update chat session token generation
CREATE OR REPLACE FUNCTION public.generate_chat_session_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'chat_' || replace(gen_random_uuid()::text, '-', '');
END;
$$;

-- Update appointment confirmation token generation
CREATE OR REPLACE FUNCTION public.generate_appointment_confirmation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'appt_' || replace(gen_random_uuid()::text, '-', '');
END;
$$;