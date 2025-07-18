-- Fix payment recording system to properly handle invoice-to-order relationships
-- and create payment_records when payments are made

-- Create function to record payments that properly handles both payments and payment_records tables
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
  order_record RECORD;
  payment_id UUID;
  payment_record_id UUID;
  result jsonb;
BEGIN
  -- Get invoice details
  SELECT i.*, 
         o.id as order_id,
         o.order_number
  INTO invoice_record
  FROM invoices i
  LEFT JOIN orders o ON o.customer_email = i.customer_email
  WHERE i.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
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
  IF invoice_record.order_id IS NOT NULL THEN
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
      invoice_record.order_id,
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
    'amount', p_amount
  );
  
  RETURN result;
END;
$$;