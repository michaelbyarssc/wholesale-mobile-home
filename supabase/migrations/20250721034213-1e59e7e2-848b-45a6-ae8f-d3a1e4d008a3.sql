-- COMPLETELY DISABLE THE DEL DELIVERY NUMBER SYSTEM
-- This fixes the issue where deliveries were getting DEL-XXXXXX instead of WMH-D-XXXXXX

-- First, drop the trigger that auto-generates DEL numbers
DROP TRIGGER IF EXISTS trigger_auto_generate_delivery_number ON public.deliveries;

-- Drop the old delivery number generation functions
DROP FUNCTION IF EXISTS public.auto_generate_delivery_number();
DROP FUNCTION IF EXISTS public.generate_delivery_number();

-- Drop the delivery number sequence that was creating DEL numbers
DROP SEQUENCE IF EXISTS delivery_number_seq;

-- Update the auto_assign_transaction_number function to handle deliveries properly
-- This ensures deliveries get WMH-D-XXXXXX format using the transaction number system
CREATE OR REPLACE FUNCTION public.auto_assign_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    WHEN 'deliveries' THEN 'deliveries'
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
    
  -- For deliveries, use the base number from the related invoice
  ELSIF record_type = 'deliveries' AND NEW.delivery_number IS NULL THEN
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT extract_base_transaction_number(transaction_number) INTO invoice_base_number
      FROM invoices WHERE id = NEW.invoice_id;
      
      IF invoice_base_number IS NOT NULL THEN
        NEW.delivery_number := 'WMH-D-' || invoice_base_number;
      ELSE
        NEW.delivery_number := generate_formatted_transaction_number('deliveries');
      END IF;
    ELSE
      NEW.delivery_number := generate_formatted_transaction_number('deliveries');
    END IF;
    
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

-- Ensure the correct trigger exists for deliveries
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON deliveries;
CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON deliveries 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();