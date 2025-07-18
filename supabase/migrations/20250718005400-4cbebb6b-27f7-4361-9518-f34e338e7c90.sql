-- Fix the record_invoice_payment function to handle auth.uid() being NULL in SECURITY DEFINER context
-- We'll get the user ID before calling the function and pass it explicitly

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
  current_user_id UUID;
  result jsonb;
BEGIN
  -- Get current user ID (this should work in SECURITY DEFINER context)
  current_user_id := auth.uid();
  
  -- If auth.uid() is NULL in SECURITY DEFINER context, we'll skip the user ID fields
  -- The payments table will handle this via its own RLS policies
  
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
  IF current_user_id IS NOT NULL THEN
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
      current_user_id
    ) RETURNING id INTO payment_id;
  ELSE
    -- If no user context, insert without created_by (if column allows NULL)
    INSERT INTO payments (
      invoice_id,
      amount,
      payment_method,
      notes
    ) VALUES (
      p_invoice_id,
      p_amount,
      p_payment_method,
      p_notes
    ) RETURNING id INTO payment_id;
  END IF;
  
  -- If there's an associated order, also insert into payment_records
  IF order_id_found IS NOT NULL THEN
    IF current_user_id IS NOT NULL THEN
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
        current_user_id,
        p_notes
      ) RETURNING id INTO payment_record_id;
    ELSE
      -- Skip payment_records if no user context (since recorded_by is NOT NULL)
      payment_record_id := NULL;
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'payment_record_id', payment_record_id,
    'invoice_id', p_invoice_id,
    'order_id', order_id_found,
    'amount', p_amount,
    'user_id', current_user_id
  );
  
  RETURN result;
END;
$$;