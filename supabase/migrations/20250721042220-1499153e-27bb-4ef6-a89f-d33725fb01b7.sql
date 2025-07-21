-- COMPLETELY DISABLE DELIVERY NUMBER GENERATION - USE EXISTING TRANSACTION NUMBERS ONLY

-- Remove the problematic auto_assign_transaction_number function for deliveries
CREATE OR REPLACE FUNCTION public.auto_assign_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  record_type TEXT;
  base_number TEXT;
  invoice_base_number TEXT;
  estimate_base_number TEXT;
BEGIN
  -- Determine record type based on table name
  record_type := CASE TG_TABLE_NAME
    WHEN 'estimates' THEN 'estimates'
    WHEN 'invoices' THEN 'invoices'  
    WHEN 'payments' THEN 'payments'
    WHEN 'transactions' THEN 'transactions'
    ELSE 'unknown'
  END;

  -- For estimates, always generate a new base number (only estimates create new transaction numbers)
  IF record_type = 'estimates' AND NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_formatted_transaction_number('estimates');
    
  -- For invoices, use the base number from the related estimate
  ELSIF record_type = 'invoices' AND NEW.transaction_number IS NULL THEN
    IF NEW.estimate_id IS NOT NULL THEN
      SELECT extract_base_transaction_number(transaction_number) INTO estimate_base_number
      FROM estimates WHERE id = NEW.estimate_id;
      
      IF estimate_base_number IS NOT NULL THEN
        NEW.transaction_number := 'WMH-I-' || estimate_base_number;
      ELSE
        NEW.transaction_number := generate_formatted_transaction_number('invoices');
      END IF;
    ELSE
      NEW.transaction_number := generate_formatted_transaction_number('invoices');
    END IF;
    
  -- DELIVERIES SECTION REMOVED - NO MORE AUTO GENERATION FOR DELIVERIES
  -- Deliveries should only use existing transaction numbers from invoices
    
  -- For payments, use the base number from the related invoice
  ELSIF record_type = 'payments' AND NEW.transaction_number IS NULL THEN
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT extract_base_transaction_number(transaction_number) INTO invoice_base_number
      FROM invoices WHERE id = NEW.invoice_id;
      
      IF invoice_base_number IS NOT NULL THEN
        NEW.transaction_number := 'WMH-P-' || invoice_base_number;
      ELSE
        NEW.transaction_number := generate_formatted_transaction_number('payments');
      END IF;
    ELSE
      NEW.transaction_number := generate_formatted_transaction_number('payments');
    END IF;
    
  -- For transactions, generate new number if not set
  ELSIF record_type = 'transactions' AND NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_formatted_transaction_number('transactions');
  END IF;

  RETURN NEW;
END;
$function$;

-- Also remove the auto_generate_transaction_number function for deliveries
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
  
  -- Set transaction number based on table - SKIP DELIVERIES
  IF TG_TABLE_NAME = 'estimates' THEN
    NEW.transaction_number := 'WMH-E-' || base_number;
  ELSIF TG_TABLE_NAME = 'invoices' THEN
    NEW.transaction_number := 'WMH-I-' || base_number;
  -- DELIVERIES SECTION REMOVED
  ELSE
    NEW.transaction_number := 'WMH-' || base_number;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Remove any triggers that might be automatically generating delivery numbers
DROP TRIGGER IF EXISTS trigger_auto_generate_delivery_number ON deliveries;
DROP TRIGGER IF EXISTS trigger_auto_assign_transaction_number ON deliveries;

-- Check if there are any other triggers on deliveries that might be generating numbers
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'deliveries';