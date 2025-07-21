-- FIX TRANSACTION NUMBER CONSISTENCY - USE EXISTING TRANSACTION NUMBER FOR DELIVERIES

CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance NUMERIC;
  total_payments NUMERIC;
  new_balance NUMERIC;
  invoice_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the invoice total amount
    SELECT total_amount INTO invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;
    
    -- Calculate total payments for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id;
    
    -- Calculate new balance
    new_balance := invoice_total - total_payments;
    
    -- Ensure balance doesn't go negative
    IF new_balance < 0 THEN
      new_balance := 0;
    END IF;
    
    -- Update the invoice
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = CASE 
        WHEN new_balance = 0 THEN 'paid'
        ELSE 'pending'
      END,
      paid_at = CASE 
        WHEN new_balance = 0 AND paid_at IS NULL THEN now()
        ELSE paid_at
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    
    -- If fully paid, create delivery if it doesn't exist
    IF new_balance = 0 THEN
      -- Check if delivery already exists
      IF NOT EXISTS(SELECT 1 FROM public.deliveries WHERE invoice_id = NEW.invoice_id) THEN
        -- Create a basic delivery record using the SAME transaction number as the invoice
        INSERT INTO public.deliveries (
          invoice_id,
          delivery_number,
          customer_name,
          customer_email,
          customer_phone,
          pickup_address,
          delivery_address,
          mobile_home_id,
          mobile_home_type,
          crew_type,
          status,
          total_delivery_cost,
          created_by,
          transaction_number
        )
        SELECT 
          i.id,
          i.transaction_number, -- USE THE SAME TRANSACTION NUMBER, NOT A NEW ONE
          i.customer_name,
          i.customer_email,
          i.customer_phone,
          'Factory Location',
          i.delivery_address,
          i.mobile_home_id,
          CASE 
            WHEN mh.width_feet >= 16 THEN 'double_wide'::mobile_home_type
            ELSE 'single_wide'::mobile_home_type
          END,
          CASE 
            WHEN mh.width_feet >= 16 THEN 'double_wide_crew'::delivery_crew_type
            ELSE 'single_driver'::delivery_crew_type
          END,
          'pending_payment'::delivery_status,
          i.total_amount,
          COALESCE(auth.uid(), NEW.created_by),
          i.transaction_number -- USE THE SAME TRANSACTION NUMBER HERE TOO
        FROM public.invoices i
        LEFT JOIN public.mobile_homes mh ON mh.id = i.mobile_home_id
        WHERE i.id = NEW.invoice_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle payment deletion
  IF TG_OP = 'DELETE' THEN
    -- Recalculate balance after payment deletion
    SELECT total_amount INTO invoice_total
    FROM public.invoices
    WHERE id = OLD.invoice_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM public.payments
    WHERE invoice_id = OLD.invoice_id;
    
    new_balance := invoice_total - total_payments;
    
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = CASE 
        WHEN new_balance = 0 THEN 'paid'
        ELSE 'pending'
      END,
      paid_at = CASE 
        WHEN new_balance = 0 THEN paid_at
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;