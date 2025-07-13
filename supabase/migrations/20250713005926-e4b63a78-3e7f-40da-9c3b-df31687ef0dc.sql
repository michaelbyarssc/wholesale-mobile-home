-- Update approve_estimate function to copy all detailed information from estimate to invoice
CREATE OR REPLACE FUNCTION approve_estimate(estimate_uuid UUID)
RETURNS UUID AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  new_invoice_number TEXT;
  new_delivery_id UUID;
  home_record RECORD;
  factory_address TEXT;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND approved_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found or already approved';
  END IF;
  
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
  
  -- Update estimate
  UPDATE public.estimates
  SET 
    approved_at = now(),
    status = 'approved',
    invoice_id = new_invoice_id,
    updated_at = now()
  WHERE id = estimate_uuid;
  
  -- Get mobile home details to determine type and factory
  SELECT mh.*, f.street_address || ', ' || f.city || ', ' || f.state || ' ' || f.zip_code as factory_address
  INTO home_record
  FROM public.mobile_homes mh
  LEFT JOIN public.mobile_home_factories mhf ON mh.id = mhf.mobile_home_id
  LEFT JOIN public.factories f ON mhf.factory_id = f.id
  WHERE mh.id = estimate_record.mobile_home_id;
  
  -- Determine mobile home type and crew type
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
    
    -- Insert initial status history
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
      'Delivery created from approved estimate ' || estimate_record.id::TEXT
    );
  END;
  
  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;