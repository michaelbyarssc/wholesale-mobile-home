-- Fix the auto_assign_transaction_number function to properly handle payments table
-- The function is looking for estimate_id in payments table but it doesn't exist

CREATE OR REPLACE FUNCTION public.auto_assign_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_number TEXT;
  record_type TEXT;
BEGIN
  -- Determine record type from table name
  CASE TG_TABLE_NAME
    WHEN 'estimates' THEN record_type := 'estimate';
    WHEN 'invoices' THEN record_type := 'invoice';
    WHEN 'deliveries' THEN record_type := 'delivery';
    WHEN 'payments' THEN record_type := 'payment';
    WHEN 'transactions' THEN record_type := 'transaction';
  END CASE;
  
  -- For estimates, always generate new transaction number
  IF TG_TABLE_NAME = 'estimates' THEN
    NEW.transaction_number := generate_formatted_transaction_number('estimate');
  -- For invoices, check if related to estimate
  ELSIF TG_TABLE_NAME = 'invoices' AND NEW.estimate_id IS NOT NULL THEN
    -- Get base number from related estimate
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM estimates WHERE id = NEW.estimate_id;
    NEW.transaction_number := 'WMH-I-' || base_number;
  -- For deliveries, check if related to invoice
  ELSIF TG_TABLE_NAME = 'deliveries' AND NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    NEW.transaction_number := 'WMH-D-' || base_number;
  -- For payments, get transaction number from related invoice (payments table doesn't have estimate_id)
  ELSIF TG_TABLE_NAME = 'payments' AND NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    NEW.transaction_number := 'WMH-P-' || base_number;
  -- For transactions, generate display number
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    NEW.display_number := generate_formatted_transaction_number('transaction');
  -- For orphaned records, generate new transaction number
  ELSE
    IF TG_TABLE_NAME = 'invoices' THEN
      NEW.transaction_number := generate_formatted_transaction_number('invoice');
    ELSIF TG_TABLE_NAME = 'deliveries' THEN
      NEW.transaction_number := generate_formatted_transaction_number('delivery');
    ELSIF TG_TABLE_NAME = 'payments' THEN
      NEW.transaction_number := generate_formatted_transaction_number('payment');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Check if there's a trigger on payments table and recreate it if needed
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON payments;

-- Recreate the trigger to auto-assign transaction numbers to payments
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();