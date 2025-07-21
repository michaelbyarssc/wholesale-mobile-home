-- Fix delivery number reference issue
-- This removes any reference to delivery_number field that doesn't exist

-- Check if there are any problematic triggers or functions referencing delivery_number
-- and fix the auto_generate_transaction_number function

CREATE OR REPLACE FUNCTION public.auto_generate_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_number TEXT;
BEGIN
  -- Generate base number from sequence
  base_number := LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
  
  -- Set transaction number based on table
  IF TG_TABLE_NAME = 'estimates' THEN
    NEW.transaction_number := 'WMH-E-' || base_number;
  ELSIF TG_TABLE_NAME = 'invoices' THEN
    NEW.transaction_number := 'WMH-I-' || base_number;
  ELSIF TG_TABLE_NAME = 'deliveries' THEN
    -- For deliveries, use WMH-D prefix instead of delivery_number
    NEW.transaction_number := 'WMH-D-' || base_number;
  ELSE
    NEW.transaction_number := 'WMH-' || base_number;
  END IF;
  
  RETURN NEW;
END;
$function$;