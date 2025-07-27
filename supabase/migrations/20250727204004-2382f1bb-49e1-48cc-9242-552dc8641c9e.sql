-- Fix security warnings by setting proper search path for functions
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION format_phone_number(phone_input TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
IMMUTABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove all non-digits
  phone_input := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- If it starts with 1 and is 11 digits, remove the 1
  IF length(phone_input) = 11 AND substring(phone_input, 1, 1) = '1' THEN
    phone_input := substring(phone_input, 2);
  END IF;
  
  -- If it's 10 digits, format as XXX-XXX-XXXX
  IF length(phone_input) = 10 THEN
    RETURN substring(phone_input, 1, 3) || '-' || substring(phone_input, 4, 3) || '-' || substring(phone_input, 7, 4);
  END IF;
  
  -- Return original if not 10 digits
  RETURN phone_input;
END;
$$;