-- Force trigger the balance update by manually calling the function for this invoice
DO $$
DECLARE
  invoice_uuid UUID := '661a8a85-fc80-4b2f-aa88-8ba6cfb09a8f';
  total_payments_calc NUMERIC;
  invoice_total_calc NUMERIC;
  new_balance_calc NUMERIC;
BEGIN
  -- Get the invoice total amount
  SELECT total_amount INTO invoice_total_calc
  FROM public.invoices
  WHERE id = invoice_uuid;
  
  -- Calculate total payments for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO total_payments_calc
  FROM public.payments
  WHERE invoice_id = invoice_uuid;
  
  -- Calculate new balance
  new_balance_calc := invoice_total_calc - total_payments_calc;
  
  -- Ensure balance doesn't go negative
  IF new_balance_calc < 0 THEN
    new_balance_calc := 0;
  END IF;
  
  -- Update the invoice directly
  UPDATE public.invoices 
  SET 
    balance_due = new_balance_calc,
    status = CASE 
      WHEN new_balance_calc = 0 THEN 'paid'
      ELSE 'sent'
    END,
    paid_at = CASE 
      WHEN new_balance_calc = 0 AND paid_at IS NULL THEN now()
      ELSE paid_at
    END,
    updated_at = now()
  WHERE id = invoice_uuid;
  
  -- If fully paid, create delivery if it doesn't exist
  IF new_balance_calc = 0 THEN
    -- Check if delivery already exists
    IF NOT EXISTS(SELECT 1 FROM public.deliveries WHERE invoice_id = invoice_uuid) THEN
      -- Create a basic delivery record
      INSERT INTO public.deliveries (
        invoice_id,
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        mobile_home_id,
        status,
        total_delivery_cost,
        created_by
      )
      SELECT 
        i.id,
        i.customer_name,
        i.customer_email,
        i.customer_phone,
        i.delivery_address,
        i.mobile_home_id,
        'pending_payment',
        i.total_amount,
        '2cdfc4ae-d8cc-4890-a1be-132cfbdd87d0'::uuid  -- Use a default user ID
      FROM public.invoices i
      WHERE i.id = invoice_uuid;
    END IF;
  END IF;
  
  RAISE NOTICE 'Invoice balance updated. Total: %, Payments: %, New Balance: %', 
    invoice_total_calc, total_payments_calc, new_balance_calc;
END $$;