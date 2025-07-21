-- Fix delivery transaction number to reuse base number from invoice/estimate
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
  -- Determine the record type based on table name
  record_type := TG_TABLE_NAME;
  
  CASE record_type
    WHEN 'estimates' THEN
      IF NEW.transaction_number IS NULL THEN
        NEW.transaction_number := generate_formatted_transaction_number('estimate');
      END IF;
    WHEN 'invoices' THEN
      IF NEW.transaction_number IS NULL THEN
        -- If this invoice is linked to an estimate, use the estimate's base number
        IF NEW.estimate_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM estimates WHERE id = NEW.estimate_id;
          
          IF base_number IS NOT NULL THEN
            NEW.transaction_number := 'WMH-I-' || base_number;
          ELSE
            NEW.transaction_number := generate_formatted_transaction_number('invoice');
          END IF;
        ELSE
          NEW.transaction_number := generate_formatted_transaction_number('invoice');
        END IF;
      END IF;
    WHEN 'deliveries' THEN
      IF NEW.transaction_number IS NULL THEN
        -- For deliveries, get the base number from the related invoice
        IF NEW.invoice_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM invoices WHERE id = NEW.invoice_id;
          
          IF base_number IS NOT NULL THEN
            NEW.transaction_number := 'WMH-D-' || base_number;
          ELSE
            NEW.transaction_number := generate_formatted_transaction_number('delivery');
          END IF;
        ELSE
          NEW.transaction_number := generate_formatted_transaction_number('delivery');
        END IF;
      END IF;
    WHEN 'payments' THEN
      IF NEW.transaction_number IS NULL THEN
        -- For payments, get the base number from the related invoice
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
      END IF;
    WHEN 'transactions' THEN
      IF NEW.display_number IS NULL THEN
        NEW.display_number := generate_formatted_transaction_number('transaction');
      END IF;
    ELSE
      -- Default case for other tables
      IF NEW.transaction_number IS NULL THEN
        NEW.transaction_number := generate_formatted_transaction_number('other');
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Fix the existing delivery to use the correct base number from its invoice
UPDATE deliveries 
SET transaction_number = 'WMH-D-001109' 
WHERE transaction_number = 'WMH-D-001110';