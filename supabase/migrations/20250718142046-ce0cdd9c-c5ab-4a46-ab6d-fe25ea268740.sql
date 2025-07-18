-- Fix the approve_estimate function to use valid delivery_status enum values
CREATE OR REPLACE FUNCTION public.approve_estimate(estimate_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  estimate_record RECORD;
  existing_transaction_id UUID;
  new_transaction_id UUID;
  new_invoice_id UUID;
  transaction_number_val TEXT;
  invoice_number_val TEXT;
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
  
  -- Extract base number from estimate transaction number and create invoice number
  IF estimate_record.transaction_number IS NOT NULL THEN
    -- Extract the base number (e.g., "001051" from "WMH-E-001051")
    invoice_number_val := 'WMH-I-' || split_part(estimate_record.transaction_number, '-', 3);
  ELSE
    -- Fallback to generating new number if estimate doesn't have transaction number
    invoice_number_val := 'WMH-I-' || LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
  END IF;
  
  -- Check if there's already a transaction for this estimate
  SELECT id INTO existing_transaction_id
  FROM public.transactions
  WHERE estimate_id = estimate_record.id;
  
  IF existing_transaction_id IS NOT NULL THEN
    -- Use existing transaction
    new_transaction_id := existing_transaction_id;
    
    -- Get the transaction number from existing transaction
    SELECT transaction_number INTO transaction_number_val
    FROM public.transactions
    WHERE id = new_transaction_id;
  ELSE
    -- Create transaction from estimate only if it doesn't exist
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
    
    -- Get the transaction number that was generated for the transaction
    SELECT transaction_number INTO transaction_number_val
    FROM public.transactions
    WHERE id = new_transaction_id;
  END IF;
  
  -- Approve the transaction (this will create invoice and set proper status)
  SELECT approve_transaction(new_transaction_id) INTO result;
  
  -- Check if invoice already exists for this estimate
  SELECT id INTO new_invoice_id
  FROM public.invoices
  WHERE estimate_id = estimate_record.id;
  
  IF new_invoice_id IS NULL THEN
    -- Create invoice with the invoice number derived from estimate
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
      additional_requirements,
      transaction_number
    ) VALUES (
      estimate_record.id,
      invoice_number_val, -- Use the derived invoice number
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
      estimate_record.additional_requirements,
      invoice_number_val -- Also store as transaction_number for consistency
    ) RETURNING id INTO new_invoice_id;
  END IF;
  
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
  
  -- Check if delivery already exists
  SELECT id INTO new_delivery_id
  FROM public.deliveries
  WHERE estimate_id = estimate_record.id;
  
  IF new_delivery_id IS NULL THEN
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
        crew_type := 'two_driver';
      ELSE
        home_type := 'triple_wide';
        crew_type := 'specialized';
      END IF;
      
      -- Insert delivery with valid delivery_status enum value
      INSERT INTO public.deliveries (
        estimate_id,
        invoice_id,
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        pickup_address,
        mobile_home_id,
        mobile_home_type,
        crew_type,
        status,
        delivery_number,
        scheduled_delivery_date,
        transaction_number
      ) VALUES (
        estimate_record.id,
        new_invoice_id,
        estimate_record.customer_name,
        estimate_record.customer_email,
        estimate_record.customer_phone,
        estimate_record.delivery_address,
        COALESCE(home_record.factory_address, 'Factory Address TBD'),
        estimate_record.mobile_home_id,
        home_type,
        crew_type,
        'pending_payment',  -- Use valid enum value instead of 'pending_scheduling'
        generate_delivery_number(),
        now() + interval '14 days', -- Default to 2 weeks from now
        invoice_number_val
      ) RETURNING id INTO new_delivery_id;
      
      -- Update transaction status to delivery_scheduled
      UPDATE public.transactions
      SET 
        status = 'delivery_scheduled',
        scheduled_delivery_date = now() + interval '14 days',
        updated_at = now()
      WHERE id = new_transaction_id;
      
      -- Insert initial delivery status history
      INSERT INTO public.delivery_status_history (
        delivery_id,
        new_status,
        notes,
        changed_by
      ) VALUES (
        new_delivery_id,
        'pending_payment',  -- Use valid enum value instead of 'pending_scheduling'
        'Delivery created from approved estimate',
        auth.uid()
      );
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', new_invoice_id,
    'invoice_number', invoice_number_val,
    'transaction_id', new_transaction_id,
    'delivery_id', new_delivery_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;