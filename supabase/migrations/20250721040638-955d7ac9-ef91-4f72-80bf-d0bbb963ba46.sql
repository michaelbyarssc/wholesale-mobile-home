-- FIX THE PAYMENT ERROR ONCE AND FOR ALL
-- The issue is in update_invoice_balance function still trying to use delivery_number

-- First, let's replace the problematic function completely
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
        -- Create a basic delivery record using transaction_number, NOT delivery_number
        INSERT INTO public.deliveries (
          invoice_id,
          customer_name,
          customer_email,
          customer_phone,
          delivery_address,
          mobile_home_id,
          status,
          total_delivery_cost,
          created_by,
          transaction_number
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
          COALESCE(auth.uid(), NEW.created_by),
          i.transaction_number
        FROM public.invoices i
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