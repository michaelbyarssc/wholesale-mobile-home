-- Fix the update_invoice_balance function to remove non-existent delivery_date_tz field reference

CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance NUMERIC;
  invoice_status TEXT;
  delivery_exists BOOLEAN;
  mobile_home_data RECORD;
  home_type TEXT;
  crew_type TEXT;
  new_delivery_id UUID;
  factory_data RECORD;
  estimate_data RECORD;
BEGIN
  -- Update the invoice balance_due when a payment is added
  IF TG_OP = 'INSERT' THEN
    -- Calculate new balance
    SELECT 
      i.total_amount,
      COALESCE(i.balance_due, i.total_amount) - NEW.amount as calculated_balance,
      i.mobile_home_id,
      i.customer_name,
      i.customer_email,
      i.customer_phone,
      i.delivery_address,
      i.estimate_id
    INTO 
      new_balance,
      new_balance,
      mobile_home_data
    FROM public.invoices i
    WHERE i.id = NEW.invoice_id;
    
    -- Ensure balance doesn't go negative
    IF new_balance < 0 THEN
      new_balance := 0;
    END IF;
    
    -- Determine new status
    IF new_balance = 0 THEN
      invoice_status := 'paid';
    ELSE
      invoice_status := 'sent';
    END IF;
    
    -- Update invoice
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = invoice_status,
      paid_at = CASE WHEN new_balance = 0 THEN now() ELSE paid_at END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    
    -- If invoice is fully paid, create delivery if it doesn't exist
    IF new_balance = 0 THEN
      -- Check if delivery already exists
      SELECT EXISTS(
        SELECT 1 FROM public.deliveries d 
        WHERE d.invoice_id = NEW.invoice_id
      ) INTO delivery_exists;
      
      IF NOT delivery_exists THEN
        -- Get mobile home details for delivery creation
        SELECT 
          mh.*,
          f.name as factory_name,
          f.address as factory_address,
          f.phone as factory_phone,
          f.email as factory_email
        INTO mobile_home_data
        FROM public.mobile_homes mh
        LEFT JOIN public.factories f ON mh.factory_id = f.id
        WHERE mh.id = (
          SELECT mobile_home_id FROM public.invoices WHERE id = NEW.invoice_id
        );
        
        -- Get estimate data
        SELECT e.* INTO estimate_data
        FROM public.estimates e
        JOIN public.invoices i ON i.estimate_id = e.id
        WHERE i.id = NEW.invoice_id;
        
        -- Determine home type and crew type based on width
        IF mobile_home_data.width_feet <= 16 THEN
          home_type := 'single_wide';
          crew_type := 'standard';
        ELSIF mobile_home_data.width_feet <= 20 THEN
          home_type := 'double_wide_narrow';
          crew_type := 'standard';
        ELSE
          home_type := 'double_wide';
          crew_type := 'heavy_duty';
        END IF;
        
        -- Create delivery record
        INSERT INTO public.deliveries (
          invoice_id,
          customer_name,
          customer_email,
          customer_phone,
          delivery_address,
          mobile_home_id,
          factory_name,
          factory_address,
          factory_phone,
          factory_email,
          home_type,
          crew_type,
          status,
          total_delivery_cost,
          created_by
        ) VALUES (
          NEW.invoice_id,
          COALESCE(estimate_data.customer_name, mobile_home_data.customer_name),
          COALESCE(estimate_data.customer_email, mobile_home_data.customer_email),
          COALESCE(estimate_data.customer_phone, mobile_home_data.customer_phone),
          COALESCE(estimate_data.delivery_address, mobile_home_data.delivery_address),
          mobile_home_data.id,
          mobile_home_data.factory_name,
          mobile_home_data.factory_address,
          mobile_home_data.factory_phone,
          mobile_home_data.factory_email,
          home_type,
          crew_type,
          'pending_payment',
          COALESCE(estimate_data.total_amount, 5000.00), -- Default delivery cost
          auth.uid()
        ) RETURNING id INTO new_delivery_id;
        
        -- Log the delivery creation
        INSERT INTO public.delivery_status_history (
          delivery_id,
          previous_status,
          new_status,
          changed_by,
          notes
        ) VALUES (
          new_delivery_id,
          NULL,
          'pending_payment',
          auth.uid(),
          'Delivery automatically created when invoice was paid in full'
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle payment deletion (refund scenario)
  IF TG_OP = 'DELETE' THEN
    -- Recalculate balance
    SELECT 
      COALESCE(balance_due, 0) + OLD.amount as new_balance
    INTO new_balance
    FROM public.invoices 
    WHERE id = OLD.invoice_id;
    
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = 'sent',
      paid_at = NULL,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;