-- Ensure the transaction numbering system works correctly across all tables
-- First, let's make sure the generate_formatted_transaction_number function includes repairs

CREATE OR REPLACE FUNCTION public.generate_formatted_transaction_number(record_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_number TEXT;
  prefix TEXT;
BEGIN
  base_number := generate_base_transaction_number();
  
  CASE record_type
    WHEN 'estimate' THEN prefix := 'WMH-E-';
    WHEN 'invoice' THEN prefix := 'WMH-I-';
    WHEN 'delivery' THEN prefix := 'WMH-D-';
    WHEN 'payment' THEN prefix := 'WMH-P-';
    WHEN 'repair' THEN prefix := 'WMH-R-';
    WHEN 'transaction' THEN prefix := 'WMH-T-';
    ELSE prefix := 'WMH-X-';
  END CASE;
  
  RETURN prefix || base_number;
END;
$$;

-- Update the auto_assign_transaction_number function to handle repairs and ensure proper linking
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
    WHEN 'transactions' THEN 
      -- For transactions table, use the transaction_type field if available
      IF NEW.transaction_type = 'repair' THEN
        record_type := 'repair';
      ELSE
        record_type := 'transaction';
      END IF;
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
  -- For payments, get transaction number from related invoice
  ELSIF TG_TABLE_NAME = 'payments' AND NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    NEW.transaction_number := 'WMH-P-' || base_number;
  -- For transactions table
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    -- If it's linked to an estimate, use that base number
    IF NEW.estimate_id IS NOT NULL THEN
      SELECT extract_base_transaction_number(transaction_number) INTO base_number
      FROM estimates WHERE id = NEW.estimate_id;
      CASE 
        WHEN NEW.transaction_type = 'repair' THEN
          NEW.transaction_number := 'WMH-R-' || base_number;
        ELSE
          NEW.transaction_number := 'WMH-T-' || base_number;
      END CASE;
    ELSE
      -- Generate new number for orphaned transactions
      NEW.transaction_number := generate_formatted_transaction_number(record_type);
    END IF;
  -- For orphaned records, generate new transaction number
  ELSE
    NEW.transaction_number := generate_formatted_transaction_number(record_type);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure triggers exist on all relevant tables
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON estimates;
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON invoices;
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON deliveries;
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON payments;
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON transactions;
CREATE TRIGGER auto_assign_transaction_number_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();