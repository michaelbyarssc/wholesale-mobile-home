-- Fix the record_invoice_payment function to handle potential RLS issues
-- and simplify the order lookup

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
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
  invoice_record RECORD;
  order_id_found UUID;
  payment_id UUID;
  payment_record_id UUID;
  result jsonb;
BEGIN
  -- Get invoice details first
  SELECT *
  INTO invoice_record
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Look for an order with matching customer email (using SECURITY DEFINER to bypass RLS)
  SELECT id INTO order_id_found
  FROM orders 
  WHERE customer_email = invoice_record.customer_email
  LIMIT 1;
  
  -- Insert into payments table (existing system)
  INSERT INTO payments (
    invoice_id,
    amount,
    payment_method,
    notes,
    created_by
  ) VALUES (
    p_invoice_id,
    p_amount,
    p_payment_method,
    p_notes,
    auth.uid()
  ) RETURNING id INTO payment_id;
  
  -- If there's an associated order, also insert into payment_records
  IF order_id_found IS NOT NULL THEN
    INSERT INTO payment_records (
      order_id,
      invoice_id,
      amount,
      payment_method,
      payment_reference,
      payment_date,
      recorded_by,
      notes
    ) VALUES (
      order_id_found,
      p_invoice_id,
      p_amount,
      p_payment_method,
      p_payment_reference,
      now(),
      auth.uid(),
      p_notes
    ) RETURNING id INTO payment_record_id;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'payment_record_id', payment_record_id,
    'invoice_id', p_invoice_id,
    'order_id', order_id_found,
    'amount', p_amount
  );
  
  RETURN result;
END;
$$;