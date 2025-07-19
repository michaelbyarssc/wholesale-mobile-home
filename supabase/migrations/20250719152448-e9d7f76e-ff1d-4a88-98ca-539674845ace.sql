-- Fix delivery status in record_invoice_payment_optimized function
CREATE OR REPLACE FUNCTION public.record_invoice_payment_optimized(
  p_invoice_id uuid, 
  p_amount numeric, 
  p_payment_method text DEFAULT 'cash'::text, 
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  payment_id UUID;
  new_balance NUMERIC;
  invoice_total NUMERIC;
  current_balance NUMERIC;
  new_status TEXT;
  paid_at_timestamp TIMESTAMP WITH TIME ZONE;
  invoice_record RECORD;
  home_record RECORD;
  new_delivery_id UUID;
  delivery_number_val TEXT;
  home_type mobile_home_type;
  crew_type delivery_crew_type;
BEGIN
  -- Get current invoice data with related info
  SELECT 
    i.*,
    e.delivery_address,
    e.mobile_home_id,
    e.customer_name,
    e.customer_email,
    e.customer_phone
  INTO invoice_record
  FROM public.invoices i
  LEFT JOIN public.estimates e ON i.estimate_id = e.id
  WHERE i.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invoice not found'
    );
  END IF;
  
  -- Calculate new balance
  new_balance := COALESCE(invoice_record.balance_due, invoice_record.total_amount) - p_amount;
  IF new_balance < 0 THEN
    new_balance := 0;
  END IF;
  
  -- Determine new status and paid_at timestamp
  IF new_balance = 0 THEN
    new_status := 'paid';
    paid_at_timestamp := now();
  ELSE
    new_status := invoice_record.status;
    paid_at_timestamp := invoice_record.paid_at;
  END IF;
  
  -- Insert payment record
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
  
  -- Update invoice in one statement
  UPDATE public.invoices
  SET 
    balance_due = new_balance,
    status = new_status,
    paid_at = paid_at_timestamp,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Create delivery if invoice is fully paid and no delivery exists
  IF new_balance = 0 AND new_status = 'paid' THEN
    -- Check if delivery already exists
    IF NOT EXISTS (SELECT 1 FROM public.deliveries WHERE invoice_id = p_invoice_id) THEN
      
      -- Get mobile home details to determine type and factory
      SELECT 
        mh.*,
        COALESCE(f.street_address || ', ' || f.city || ', ' || f.state || ' ' || f.zip_code, 'Factory address not set') as factory_address,
        mhf.factory_id
      INTO home_record
      FROM public.mobile_homes mh
      LEFT JOIN public.mobile_home_factories mhf ON mh.id = mhf.mobile_home_id
      LEFT JOIN public.factories f ON mhf.factory_id = f.id
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
      
      -- Generate delivery number with WMH-D- prefix
      delivery_number_val := 'WMH-D-' || LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
      
      -- Create delivery record with correct status
      INSERT INTO public.deliveries (
        invoice_id,
        estimate_id,
        mobile_home_id,
        delivery_number,
        status,
        mobile_home_type,
        crew_type,
        customer_name,
        customer_email,
        customer_phone,
        pickup_address,
        delivery_address,
        factory_id,
        transaction_number,
        created_by
      ) VALUES (
        p_invoice_id,
        invoice_record.estimate_id,
        invoice_record.mobile_home_id,
        delivery_number_val,
        'scheduled',
        home_type,
        crew_type,
        COALESCE(invoice_record.customer_name, 'Customer Name'),
        COALESCE(invoice_record.customer_email, 'customer@email.com'),
        COALESCE(invoice_record.customer_phone, '0000000000'),
        COALESCE(home_record.factory_address, 'Factory address not set'),
        COALESCE(invoice_record.delivery_address, 'Delivery address not set'),
        home_record.factory_id,
        delivery_number_val,
        auth.uid()
      ) RETURNING id INTO new_delivery_id;
      
      -- Insert delivery status history
      INSERT INTO public.delivery_status_history (
        delivery_id,
        previous_status,
        new_status,
        changed_by,
        notes
      ) VALUES (
        new_delivery_id,
        NULL,
        'scheduled',
        auth.uid(),
        'Delivery created automatically when invoice was fully paid'
      );
      
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'new_balance', new_balance,
    'invoice_status', new_status,
    'delivery_created', CASE WHEN new_delivery_id IS NOT NULL THEN true ELSE false END,
    'delivery_id', new_delivery_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;