-- Create an optimized payment recording function that does everything in one transaction
CREATE OR REPLACE FUNCTION public.record_invoice_payment_optimized(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  payment_id UUID;
  new_balance NUMERIC;
  invoice_total NUMERIC;
  current_balance NUMERIC;
  new_status TEXT;
  paid_at_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current invoice data and insert payment in a single query block
  SELECT total_amount, COALESCE(balance_due, total_amount) 
  INTO invoice_total, current_balance
  FROM public.invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invoice not found'
    );
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  IF new_balance < 0 THEN
    new_balance := 0;
  END IF;
  
  -- Determine new status and paid_at timestamp
  IF new_balance = 0 THEN
    new_status := 'paid';
    paid_at_timestamp := now();
  ELSE
    new_status := (SELECT status FROM public.invoices WHERE id = p_invoice_id);
    paid_at_timestamp := (SELECT paid_at FROM public.invoices WHERE id = p_invoice_id);
  END IF;
  
  -- Insert payment record
  INSERT INTO public.payments (
    invoice_id,
    amount,
    payment_method,
    notes,
    payment_date,
    created_by
  ) VALUES (
    p_invoice_id,
    p_amount,
    p_payment_method,
    p_notes,
    now(),
    auth.uid()
  ) RETURNING id INTO payment_id;
  
  -- Update invoice in one statement
  UPDATE public.invoices
  SET 
    balance_due = new_balance,
    status = new_status,
    paid_at = paid_at_timestamp,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'new_balance', new_balance,
    'invoice_status', new_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;