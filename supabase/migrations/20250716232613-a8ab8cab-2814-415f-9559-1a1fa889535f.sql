-- Fix function search_path security warnings
-- Update extract_base_transaction_number function
CREATE OR REPLACE FUNCTION public.extract_base_transaction_number(formatted_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Extract the number part after the last dash
  RETURN split_part(formatted_number, '-', 3);
END;
$function$;

-- Update generate_customer_color function
CREATE OR REPLACE FUNCTION public.generate_customer_color(customer_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  colors TEXT[] := ARRAY[
    'hsl(210, 100%, 45%)',  -- Blue
    'hsl(168, 100%, 35%)',  -- Teal
    'hsl(142, 100%, 35%)',  -- Green
    'hsl(45, 100%, 45%)',   -- Yellow
    'hsl(25, 100%, 50%)',   -- Orange
    'hsl(0, 100%, 50%)',    -- Red
    'hsl(280, 100%, 45%)',  -- Purple
    'hsl(320, 100%, 45%)',  -- Pink
    'hsl(200, 100%, 35%)',  -- Light Blue
    'hsl(160, 100%, 40%)'   -- Mint
  ];
  hash_value BIGINT;
  color_index INTEGER;
BEGIN
  -- Generate hash from customer name
  hash_value := abs(hashtext(lower(trim(customer_name))));
  color_index := (hash_value % array_length(colors, 1)) + 1;
  
  RETURN colors[color_index];
END;
$function$;

-- Update update_invoice_balance function
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the invoice balance when a payment is added
    UPDATE invoices 
    SET 
      balance_due = total_amount - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE invoice_id = NEW.invoice_id
      ),
      updated_at = now()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Update the invoice balance when a payment is removed
    UPDATE invoices 
    SET 
      balance_due = total_amount - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE invoice_id = OLD.invoice_id
      ),
      updated_at = now()
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;