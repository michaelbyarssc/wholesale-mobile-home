-- Create a simple version without auth.uid() to isolate the issue
CREATE OR REPLACE FUNCTION public.record_invoice_payment_simple(
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
  
  -- Insert payment record WITHOUT auth.uid()
  INSERT INTO public.payments (
    invoice_id,
    amount,
    payment_method,
    notes,
    payment_date
  ) VALUES (
    p_invoice_id,
    p_amount,
    p_payment_method,
    p_notes,
    now()
  ) RETURNING id INTO payment_id;
  
  -- Update invoice balance
  UPDATE public.invoices
  SET 
    balance_due = new_balance,
    status = CASE 
      WHEN new_balance = 0 THEN 'paid'
      ELSE status
    END,
    paid_at = CASE 
      WHEN new_balance = 0 THEN now()
      ELSE paid_at
    END,
    updated_at = now()
  WHERE id = p_invoice_id;
  
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