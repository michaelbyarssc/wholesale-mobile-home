-- Clean up any potential issues with payment processing

-- First, drop and recreate the payment transaction number trigger to ensure it's clean
DROP TRIGGER IF EXISTS generate_payment_transaction_number_trigger ON payments;

-- Recreate the generate_payment_transaction_number function cleanly
CREATE OR REPLACE FUNCTION public.generate_payment_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_number TEXT;
BEGIN
  -- For payments, get transaction number from related invoice
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    
    IF base_number IS NOT NULL THEN
      NEW.transaction_number := 'WMH-P-' || base_number;
    ELSE
      NEW.transaction_number := generate_formatted_transaction_number('payment');
    END IF;
  ELSE
    NEW.transaction_number := generate_formatted_transaction_number('payment');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER generate_payment_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_transaction_number();

-- Ensure the update_invoice_balance trigger exists and is correct
DROP TRIGGER IF EXISTS update_invoice_balance_on_payment ON payments;

-- Recreate the trigger to make sure it's properly linked
CREATE TRIGGER update_invoice_balance_on_payment
  AFTER INSERT OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();