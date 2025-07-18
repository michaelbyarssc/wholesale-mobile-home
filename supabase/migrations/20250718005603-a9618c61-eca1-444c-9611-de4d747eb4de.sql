-- Drop and recreate the function completely to avoid any caching issues

DROP FUNCTION IF EXISTS public.record_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT);

-- Recreate the function with a clean slate
CREATE FUNCTION public.record_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invoice_rec RECORD;
  order_id_val UUID;
  payment_id_val UUID;
  payment_record_id_val UUID;
  user_id_val UUID;
  result_val jsonb;
BEGIN
  -- Get current user ID
  user_id_val := auth.uid();
  
  -- Get invoice details
  SELECT * INTO invoice_rec FROM invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Find order by customer email
  SELECT id INTO order_id_val FROM orders WHERE customer_email = invoice_rec.customer_email LIMIT 1;
  
  -- Insert payment
  INSERT INTO payments (invoice_id, amount, payment_method, notes, created_by)
  VALUES (p_invoice_id, p_amount, p_payment_method, p_notes, user_id_val)
  RETURNING id INTO payment_id_val;
  
  -- Insert payment record if order exists and user exists
  IF order_id_val IS NOT NULL AND user_id_val IS NOT NULL THEN
    INSERT INTO payment_records (order_id, invoice_id, amount, payment_method, payment_reference, payment_date, recorded_by, notes)
    VALUES (order_id_val, p_invoice_id, p_amount, p_payment_method, p_payment_reference, now(), user_id_val, p_notes)
    RETURNING id INTO payment_record_id_val;
  END IF;
  
  result_val := jsonb_build_object(
    'success', true,
    'payment_id', payment_id_val,
    'payment_record_id', payment_record_id_val,
    'invoice_id', p_invoice_id,
    'order_id', order_id_val,
    'amount', p_amount
  );
  
  RETURN result_val;
END;
$$;