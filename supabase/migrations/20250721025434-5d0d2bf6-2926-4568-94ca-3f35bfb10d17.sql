-- Transaction number system: Only estimates generate new base numbers
-- All other records (invoice, payments, delivery, repairs) reuse the estimate's base number
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
      -- ONLY estimates generate new base transaction numbers
      IF NEW.transaction_number IS NULL THEN
        NEW.transaction_number := generate_formatted_transaction_number('estimate');
      END IF;
      
    WHEN 'invoices' THEN
      -- Invoices always reuse the estimate's base number
      IF NEW.transaction_number IS NULL THEN
        IF NEW.estimate_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM estimates WHERE id = NEW.estimate_id;
          
          IF base_number IS NOT NULL THEN
            NEW.transaction_number := 'WMH-I-' || base_number;
          ELSE
            -- Fallback if estimate has no transaction number (shouldn't happen)
            NEW.transaction_number := generate_formatted_transaction_number('invoice');
          END IF;
        ELSE
          -- Fallback for invoices without estimates (shouldn't happen in normal flow)
          NEW.transaction_number := generate_formatted_transaction_number('invoice');
        END IF;
      END IF;
      
    WHEN 'deliveries' THEN
      -- Deliveries always reuse the estimate's base number (via invoice)
      IF NEW.transaction_number IS NULL THEN
        IF NEW.invoice_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM invoices WHERE id = NEW.invoice_id;
          
          IF base_number IS NOT NULL THEN
            NEW.transaction_number := 'WMH-D-' || base_number;
          ELSE
            -- Fallback if invoice has no transaction number (shouldn't happen)
            NEW.transaction_number := generate_formatted_transaction_number('delivery');
          END IF;
        ELSE
          -- Fallback for deliveries without invoices (shouldn't happen in normal flow)
          NEW.transaction_number := generate_formatted_transaction_number('delivery');
        END IF;
      END IF;
      
    WHEN 'payments' THEN
      -- Payments always reuse the estimate's base number (via invoice)
      IF NEW.transaction_number IS NULL THEN
        IF NEW.invoice_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM invoices WHERE id = NEW.invoice_id;
          
          IF base_number IS NOT NULL THEN
            NEW.transaction_number := 'WMH-P-' || base_number;
          ELSE
            -- Fallback if invoice has no transaction number (shouldn't happen)
            NEW.transaction_number := generate_formatted_transaction_number('payment');
          END IF;
        ELSE
          -- Fallback for payments without invoices (shouldn't happen in normal flow)
          NEW.transaction_number := generate_formatted_transaction_number('payment');
        END IF;
      END IF;
      
    WHEN 'repairs' THEN
      -- Repairs always reuse the estimate's base number (via delivery or invoice)
      IF NEW.transaction_number IS NULL THEN
        -- Try to get base number from delivery first, then invoice, then estimate
        IF NEW.delivery_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM deliveries WHERE id = NEW.delivery_id;
        ELSIF NEW.invoice_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM invoices WHERE id = NEW.invoice_id;
        ELSIF NEW.estimate_id IS NOT NULL THEN
          SELECT extract_base_transaction_number(transaction_number) INTO base_number
          FROM estimates WHERE id = NEW.estimate_id;
        END IF;
        
        IF base_number IS NOT NULL THEN
          NEW.transaction_number := 'WMH-R-' || base_number;
        ELSE
          -- Fallback if no related record has transaction number (shouldn't happen)
          NEW.transaction_number := generate_formatted_transaction_number('repair');
        END IF;
      END IF;
      
    WHEN 'transactions' THEN
      -- For the transactions table (if used)
      IF NEW.display_number IS NULL THEN
        NEW.display_number := generate_formatted_transaction_number('transaction');
      END IF;
      
    ELSE
      -- Default case for other tables (should rarely be used)
      IF NEW.transaction_number IS NULL THEN
        NEW.transaction_number := generate_formatted_transaction_number('other');
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$;