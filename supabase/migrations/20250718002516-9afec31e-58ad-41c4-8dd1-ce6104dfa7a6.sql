-- Fix the update_invoice_balance function to handle company_id requirement
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance NUMERIC;
  invoice_record RECORD;
  home_record RECORD;
  new_delivery_id UUID;
  home_type mobile_home_type;
  crew_type delivery_crew_type;
  factory_id_val UUID;
  pickup_address_val TEXT;
  default_company_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Calculate new balance after payment
    SELECT 
      i.*,
      (i.total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = NEW.invoice_id
      ), 0)) as calculated_balance
    INTO invoice_record
    FROM invoices i
    WHERE i.id = NEW.invoice_id;
    
    new_balance := invoice_record.calculated_balance;
    
    -- Update the invoice balance when a payment is added
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = CASE 
        WHEN new_balance <= 0 THEN 'paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    
    -- If balance reaches $0.00, create delivery (only if one doesn't already exist)
    IF new_balance <= 0 AND NOT EXISTS (
      SELECT 1 FROM deliveries WHERE invoice_id = NEW.invoice_id
    ) THEN
      -- Get or create default company for backward compatibility
      SELECT id INTO default_company_id
      FROM companies
      WHERE name = 'Default Company'
      LIMIT 1;

      IF default_company_id IS NULL THEN
        INSERT INTO companies (name, active, created_by)
        VALUES ('Default Company', true, COALESCE(NEW.created_by, auth.uid()))
        RETURNING id INTO default_company_id;
      END IF;
      
      -- Get mobile home and factory details
      SELECT 
        mh.*,
        f.id as factory_id,
        CONCAT(f.street_address, ', ', f.city, ', ', f.state, ' ', f.zip_code) as factory_address
      INTO home_record
      FROM mobile_homes mh
      LEFT JOIN mobile_home_factories mhf ON mh.id = mhf.mobile_home_id
      LEFT JOIN factories f ON mhf.factory_id = f.id
      WHERE mh.id = invoice_record.mobile_home_id;
      
      -- Determine home type and crew type based on width
      IF home_record.width_feet <= 18 THEN
        home_type := 'single_wide';
        crew_type := 'single_driver';
      ELSIF home_record.width_feet <= 32 THEN
        home_type := 'double_wide';
        crew_type := 'double_wide_crew';
      ELSE
        home_type := 'triple_wide';
        crew_type := 'triple_wide_crew';
      END IF;
      
      factory_id_val := home_record.factory_id;
      pickup_address_val := COALESCE(home_record.factory_address, 'Factory Address TBD');
      
      -- Create delivery record with company_id
      INSERT INTO public.deliveries (
        invoice_id,
        estimate_id,
        mobile_home_id,
        factory_id,
        company_id,
        status,
        mobile_home_type,
        crew_type,
        customer_name,
        customer_email,
        customer_phone,
        pickup_address,
        delivery_address,
        created_by
      ) VALUES (
        NEW.invoice_id,
        invoice_record.estimate_id,
        invoice_record.mobile_home_id,
        factory_id_val,
        default_company_id,
        'pending_payment',
        home_type,
        crew_type,
        invoice_record.customer_name,
        invoice_record.customer_email,
        invoice_record.customer_phone,
        pickup_address_val,
        invoice_record.delivery_address,
        COALESCE(NEW.created_by, auth.uid())
      ) RETURNING id INTO new_delivery_id;
      
      -- Log delivery creation in delivery status history
      INSERT INTO delivery_status_history (
        delivery_id,
        previous_status,
        new_status,
        changed_by,
        notes
      ) VALUES (
        new_delivery_id,
        NULL,
        'pending_payment',
        COALESCE(NEW.created_by, auth.uid()),
        'Delivery created automatically when invoice was fully paid'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Calculate new balance after payment removal
    SELECT 
      (total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = OLD.invoice_id
      ), 0)) as calculated_balance
    INTO new_balance
    FROM invoices
    WHERE id = OLD.invoice_id;
    
    -- Update the invoice balance when a payment is removed
    UPDATE public.invoices 
    SET 
      balance_due = new_balance,
      status = CASE 
        WHEN new_balance <= 0 THEN 'paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;