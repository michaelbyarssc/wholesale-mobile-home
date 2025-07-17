-- Recreate the function to update invoice balance when payments are recorded
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the invoice balance when a payment is added
    UPDATE public.invoices 
    SET 
      balance_due = total_amount - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE invoice_id = NEW.invoice_id
      ),
      status = CASE 
        WHEN (total_amount - (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE invoice_id = NEW.invoice_id
        )) <= 0 THEN 'paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Update the invoice balance when a payment is removed
    UPDATE public.invoices 
    SET 
      balance_due = total_amount - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE invoice_id = OLD.invoice_id
      ),
      status = CASE 
        WHEN (total_amount - (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE invoice_id = OLD.invoice_id
        )) <= 0 THEN 'paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger to update invoice balance when payments are inserted or deleted
CREATE TRIGGER update_invoice_balance_on_payment
  AFTER INSERT OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

-- Also add transaction number generation back for payments (without the estimate_id issue)
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

-- Create trigger for payment transaction numbers
CREATE TRIGGER generate_payment_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_transaction_number();