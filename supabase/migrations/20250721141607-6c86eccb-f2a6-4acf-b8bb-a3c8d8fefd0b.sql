-- Update the update_invoice_balance function to create separate deliveries for double-wide homes
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  total_payments NUMERIC;
  new_balance NUMERIC;
  invoice_total NUMERIC;
  home_width INTEGER;
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
        -- Get home width to determine if it's double wide
        SELECT mh.width_feet INTO home_width
        FROM public.invoices i
        LEFT JOIN public.mobile_homes mh ON mh.id = i.mobile_home_id
        WHERE i.id = NEW.invoice_id;
        
        -- For double wide homes (width >= 28 feet), create 2 deliveries
        IF home_width >= 28 THEN
          -- Create LEFT half delivery
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
            i.transaction_number || '-L', -- Add -L suffix for left half
            i.customer_name,
            i.customer_email,
            i.customer_phone,
            'Factory Location',
            i.delivery_address,
            i.mobile_home_id,
            'double_wide'::mobile_home_type,
            'double_wide_crew'::delivery_crew_type,
            'needs_scheduled'::delivery_status,
            i.total_amount / 2, -- Split cost between two deliveries
            COALESCE(auth.uid(), NEW.created_by),
            i.transaction_number || '-L'
          FROM public.invoices i
          WHERE i.id = NEW.invoice_id;

          -- Create RIGHT half delivery
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
            i.transaction_number || '-R', -- Add -R suffix for right half
            i.customer_name,
            i.customer_email,
            i.customer_phone,
            'Factory Location',
            i.delivery_address,
            i.mobile_home_id,
            'double_wide'::mobile_home_type,
            'double_wide_crew'::delivery_crew_type,
            'needs_scheduled'::delivery_status,
            i.total_amount / 2, -- Split cost between two deliveries
            COALESCE(auth.uid(), NEW.created_by),
            i.transaction_number || '-R'
          FROM public.invoices i
          WHERE i.id = NEW.invoice_id;
        ELSE
          -- For single wide homes, create single delivery (existing behavior)
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
            i.transaction_number,
            i.customer_name,
            i.customer_email,
            i.customer_phone,
            'Factory Location',
            i.delivery_address,
            i.mobile_home_id,
            'single_wide'::mobile_home_type,
            'single_driver'::delivery_crew_type,
            'needs_scheduled'::delivery_status,
            i.total_amount,
            COALESCE(auth.uid(), NEW.created_by),
            i.transaction_number
          FROM public.invoices i
          WHERE i.id = NEW.invoice_id;
        END IF;
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
$function$;