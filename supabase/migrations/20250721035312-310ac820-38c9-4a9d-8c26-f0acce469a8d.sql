-- Fix all references to delivery_number field and simplify number creation
-- Only create transaction numbers, not delivery numbers

-- Fix the send_delivery_notifications function
CREATE OR REPLACE FUNCTION public.send_delivery_notifications(delivery_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  delivery_info RECORD;
  tracking_token TEXT;
  notification_result JSONB := '{"email_sent": false, "sms_sent": false}';
BEGIN
  -- Get delivery and tracking info
  SELECT 
    d.*,
    cts.session_token
  INTO delivery_info
  FROM deliveries d
  LEFT JOIN orders o ON o.id = (
    SELECT order_id FROM customer_tracking_sessions 
    WHERE order_id IN (
      SELECT id FROM orders WHERE customer_email = d.customer_email
    ) LIMIT 1
  )
  LEFT JOIN customer_tracking_sessions cts ON cts.order_id = o.id
  WHERE d.id = delivery_id_param;
  
  IF delivery_info.session_token IS NOT NULL THEN
    tracking_token := delivery_info.session_token;
    notification_result := jsonb_build_object(
      'tracking_token', tracking_token,
      'customer_email', delivery_info.customer_email,
      'customer_phone', delivery_info.customer_phone,
      'transaction_number', delivery_info.transaction_number
    );
  END IF;
  
  RETURN notification_result;
END;
$function$;

-- Fix the auto_assign_transaction_number function to not reference delivery_number
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
    
  -- For deliveries, use transaction_number field instead of delivery_number
  ELSIF record_type = 'deliveries' AND NEW.transaction_number IS NULL THEN
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT extract_base_transaction_number(transaction_number) INTO invoice_base_number
      FROM invoices WHERE id = NEW.invoice_id;
      
      IF invoice_base_number IS NOT NULL THEN
        NEW.transaction_number := 'WMH-D-' || invoice_base_number;
      ELSE
        NEW.transaction_number := generate_formatted_transaction_number('deliveries');
      END IF;
    ELSE
      NEW.transaction_number := generate_formatted_transaction_number('deliveries');
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