-- Fix the update_invoice_balance function to properly set mobile_home_type when creating delivery
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  invoice_record RECORD;
  new_balance NUMERIC;
  delivery_exists BOOLEAN;
  mobile_home_info RECORD;
  home_type TEXT;
  crew_type TEXT;
BEGIN
  -- Get invoice information with mobile home details
  SELECT i.*, mh.width, mh.name as home_name
  INTO invoice_record
  FROM public.invoices i
  LEFT JOIN public.mobile_homes mh ON i.mobile_home_id = mh.id
  WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  IF TG_OP = 'INSERT' THEN
    -- Calculate new balance after payment
    SELECT COALESCE(SUM(amount), 0) INTO new_balance
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id;
    
    new_balance := invoice_record.total_amount - new_balance;
    
    -- Ensure balance doesn't go negative
    IF new_balance < 0 THEN
      new_balance := 0;
    END IF;
    
    -- Update invoice balance and status
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
    WHERE id = NEW.invoice_id;
    
    -- If invoice is fully paid, create delivery record if it doesn't exist
    IF new_balance = 0 THEN
      -- Check if delivery already exists
      SELECT EXISTS(
        SELECT 1 FROM public.deliveries WHERE invoice_id = NEW.invoice_id
      ) INTO delivery_exists;
      
      IF NOT delivery_exists THEN
        -- Determine home and crew type based on width
        IF invoice_record.width IS NOT NULL THEN
          IF invoice_record.width <= 16 THEN
            home_type := 'single_wide';
            crew_type := 'standard';
          ELSE
            home_type := 'double_wide';
            crew_type := 'double_wide';
          END IF;
        ELSE
          -- Default values if width is not available
          home_type := 'single_wide';
          crew_type := 'standard';
        END IF;
        
        -- Create delivery record
        INSERT INTO public.deliveries (
          invoice_id,
          customer_name,
          customer_email,
          customer_phone,
          delivery_address,
          mobile_home_id,
          mobile_home_type,
          crew_type,
          status,
          total_delivery_cost,
          estimated_delivery_date,
          created_by
        ) VALUES (
          NEW.invoice_id,
          invoice_record.customer_name,
          invoice_record.customer_email,
          invoice_record.customer_phone,
          invoice_record.delivery_address,
          invoice_record.mobile_home_id,
          home_type,
          crew_type,
          'scheduled',
          0, -- Will be calculated separately
          CURRENT_DATE + INTERVAL '7 days', -- Default 7 days from now
          COALESCE(NEW.created_by, auth.uid())
        );
      END IF;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate balance after payment deletion
    SELECT COALESCE(SUM(amount), 0) INTO new_balance
    FROM public.payments
    WHERE invoice_id = OLD.invoice_id;
    
    new_balance := invoice_record.total_amount - new_balance;
    
    -- Update invoice balance and status
    UPDATE public.invoices
    SET 
      balance_due = new_balance,
      status = CASE 
        WHEN new_balance = 0 THEN 'paid'
        ELSE 'sent'
      END,
      paid_at = CASE 
        WHEN new_balance = 0 THEN now()
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = OLD.invoice_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;