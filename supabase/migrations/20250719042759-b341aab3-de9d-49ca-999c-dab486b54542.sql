-- Create a simplified test function to isolate the issue
CREATE OR REPLACE FUNCTION public.test_payment_insert(
  p_invoice_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
BEGIN
  -- Try to insert a minimal payment record
  INSERT INTO public.payments (
    invoice_id,
    amount,
    payment_date
  ) VALUES (
    p_invoice_id,
    p_amount,
    now()
  );
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;