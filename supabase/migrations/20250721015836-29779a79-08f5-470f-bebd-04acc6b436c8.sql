-- Fix the record_invoice_payment_optimized function to remove delivery_date_tz reference

CREATE OR REPLACE FUNCTION public.record_invoice_payment_optimized(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  invoice_record RECORD;
  payment_id UUID;
  new_balance NUMERIC;
BEGIN
  -- Get current invoice data
  SELECT * INTO invoice_record
  FROM public.invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invoice not found'
    );
  END IF;
  
  -- Calculate new balance
  new_balance := COALESCE(invoice_record.balance_due, invoice_record.total_amount) - p_amount;
  
  -- Ensure balance doesn't go negative
  IF new_balance < 0 THEN
    new_balance := 0;
  END IF;
  
  -- Insert payment record (this will trigger the update_invoice_balance function)
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
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'new_balance', new_balance
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;