-- Drop existing function with different return type
DROP FUNCTION IF EXISTS public.approve_estimate(uuid);

-- Update existing estimate approval function to create transactions
CREATE OR REPLACE FUNCTION public.approve_estimate(estimate_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  estimate_record RECORD;
  new_transaction_id UUID;
  new_invoice_id UUID;
  new_invoice_number TEXT;
  new_delivery_id UUID;
  home_record RECORD;
  factory_address TEXT;
  result jsonb;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND approved_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estimate not found or already approved');
  END IF;
  
  -- Create transaction from estimate
  SELECT create_transaction_from_estimate(
    estimate_record.id,
    estimate_record.mobile_home_id,
    estimate_record.customer_name,
    estimate_record.customer_email,
    estimate_record.customer_phone,
    estimate_record.delivery_address,
    estimate_record.selected_services,
    estimate_record.selected_home_options,
    0, -- base_amount (will be calculated)
    0, -- service_amount (will be calculated)  
    0, -- tax_amount (will be calculated)
    estimate_record.total_amount,
    estimate_record.preferred_contact,
    estimate_record.timeline,
    estimate_record.additional_requirements,
    'sale'::transaction_type
  ) INTO new_transaction_id;
  
  -- Approve the transaction (this will create invoice and set proper status)
  SELECT approve_transaction(new_transaction_id) INTO result;
  
  -- Generate invoice number
  new_invoice_number := generate_invoice_number();
  
  -- Create invoice with ALL details from estimate
  INSERT INTO public.invoices (
    estimate_id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    total_amount,
    user_id,
    mobile_home_id,
    selected_services,
    selected_home_options,
    preferred_contact,
    timeline,
    additional_requirements
  ) VALUES (
    estimate_record.id,
    new_invoice_number,
    estimate_record.customer_name,
    estimate_record.customer_email,
    estimate_record.customer_phone,
    estimate_record.delivery_address,
    estimate_record.total_amount,
    estimate_record.user_id,
    estimate_record.mobile_home_id,
    estimate_record.selected_services,
    estimate_record.selected_home_options,
    estimate_record.preferred_contact,
    estimate_record.timeline,
    estimate_record.additional_requirements
  ) RETURNING id INTO new_invoice_id;
  
  -- Update estimate and transaction with invoice reference
  UPDATE public.estimates
  SET 
    approved_at = now(),
    status = 'approved',
    invoice_id = new_invoice_id,
    updated_at = now()
  WHERE id = estimate_uuid;
  
  UPDATE public.transactions
  SET 
    invoice_id = new_invoice_id,
    updated_at = now()
  WHERE id = new_transaction_id;
  
  -- Get mobile home details to determine type and factory
  SELECT mh.*, f.street_address || ', ' || f.city || ', ' || f.state || ' ' || f.zip_code as factory_address
  INTO home_record
  FROM public.mobile_homes mh
  LEFT JOIN public.mobile_home_factories mhf ON mh.id = mhf.mobile_home_id
  LEFT JOIN public.factories f ON mhf.factory_id = f.id
  WHERE mh.id = estimate_record.mobile_home_id;
  
  -- Create delivery record
  DECLARE
    home_type mobile_home_type;
    crew_type delivery_crew_type;
  BEGIN
    -- Determine home type based on width or other criteria
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
    
    -- Create delivery record
    INSERT INTO public.deliveries (
      invoice_id,
      estimate_id,
      mobile_home_id,
      status,
      mobile_home_type,
      crew_type,
      customer_name,
      customer_email,
      customer_phone,
      pickup_address,
      delivery_address,
      factory_id,
      created_by
    ) VALUES (
      new_invoice_id,
      estimate_record.id,
      estimate_record.mobile_home_id,
      'scheduled',
      home_type,
      crew_type,
      estimate_record.customer_name,
      estimate_record.customer_email,
      estimate_record.customer_phone,
      COALESCE(home_record.factory_address, 'Factory address not set'),
      estimate_record.delivery_address,
      (SELECT factory_id FROM public.mobile_home_factories WHERE mobile_home_id = estimate_record.mobile_home_id LIMIT 1),
      auth.uid()
    ) RETURNING id INTO new_delivery_id;
    
    -- Update transaction with delivery scheduling
    UPDATE public.transactions
    SET 
      status = 'delivery_scheduled',
      scheduled_delivery_date = now() + interval '7 days', -- Default 7 days from now
      updated_at = now()
    WHERE id = new_transaction_id;
    
    -- Insert initial delivery status history
    INSERT INTO public.delivery_status_history (
      delivery_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      new_delivery_id,
      'pending_payment',
      'scheduled',
      auth.uid(),
      'Delivery created from approved estimate ' || estimate_record.id::TEXT || ' and transaction ' || new_transaction_id::TEXT
    );
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'invoice_id', new_invoice_id,
    'delivery_id', new_delivery_id,
    'transaction_number', (SELECT transaction_number FROM transactions WHERE id = new_transaction_id),
    'invoice_number', new_invoice_number
  );
END;
$$;