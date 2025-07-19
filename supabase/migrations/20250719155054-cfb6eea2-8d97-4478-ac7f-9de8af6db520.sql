-- Fix payment function crew types and invoice transaction number generation

-- 1. Fix the crew type values in record_invoice_payment_optimized function
CREATE OR REPLACE FUNCTION public.record_invoice_payment_optimized(p_invoice_id uuid, p_amount numeric, p_payment_method text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  base_transaction_number TEXT;
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
  IF new_balance = 0 AND NOT EXISTS (SELECT 1 FROM deliveries WHERE invoice_id = p_invoice_id) THEN
    -- Extract base transaction number from invoice number
    base_transaction_number := split_part(invoice_record.invoice_number, '-', 3);
    
    -- Generate delivery number using same base transaction number
    delivery_number_val := 'WMH-D-' || base_transaction_number;
    
    -- Get mobile home details for crew assignment
    SELECT width_feet INTO home_record
    FROM mobile_homes
    WHERE id = invoice_record.mobile_home_id;
    
    -- Determine home type based on width with correct crew types
    IF home_record.width_feet <= 16 THEN
      home_type := 'single_wide';
      crew_type := 'single_driver';
    ELSIF home_record.width_feet <= 20 THEN
      home_type := 'double_wide';
      crew_type := 'double_wide_crew';
    ELSE
      home_type := 'triple_wide';
      crew_type := 'triple_wide_crew';
    END IF;
    
    -- Create delivery record with correct status
    INSERT INTO public.deliveries (
      invoice_id,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      mobile_home_id,
      total_delivery_cost,
      home_type,
      crew_type,
      status,
      delivery_number,
      estimated_delivery_date,
      transaction_number,
      created_by
    ) VALUES (
      p_invoice_id,
      invoice_record.customer_name,
      invoice_record.customer_email,
      invoice_record.customer_phone,
      invoice_record.delivery_address,
      invoice_record.mobile_home_id,
      invoice_record.total_amount,
      home_type,
      crew_type,
      'scheduled',
      delivery_number_val,
      now() + interval '14 days',
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
      'Delivery automatically created upon payment completion'
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', payment_id,
      'new_balance', new_balance,
      'invoice_status', new_status,
      'delivery_created', true,
      'delivery_id', new_delivery_id,
      'delivery_number', delivery_number_val
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'new_balance', new_balance,
    'invoice_status', new_status,
    'delivery_created', false
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 2. Fix the approve_estimate function to use correct transaction number for invoice
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
  base_transaction_number TEXT;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND approved_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estimate not found or already approved');
  END IF;
  
  -- Extract base number from estimate transaction number
  IF estimate_record.transaction_number IS NOT NULL THEN
    -- Extract the base number (e.g., "001051" from "WMH-E-001051")
    base_transaction_number := split_part(estimate_record.transaction_number, '-', 3);
    invoice_number_val := 'WMH-I-' || base_transaction_number;
    transaction_number_val := 'WMH-I-' || base_transaction_number;
  ELSE
    -- Fallback to generating new number if estimate doesn't have transaction number
    base_transaction_number := LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
    invoice_number_val := 'WMH-I-' || base_transaction_number;
    transaction_number_val := 'WMH-I-' || base_transaction_number;
  END IF;
  
  -- Check if there's already a transaction for this estimate
  SELECT id INTO existing_transaction_id
  FROM public.transactions
  WHERE estimate_id = estimate_record.id;
  
  IF existing_transaction_id IS NOT NULL THEN
    -- Use existing transaction
    new_transaction_id := existing_transaction_id;
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
  END IF;
  
  -- Approve the transaction (this will create invoice and set proper status)
  SELECT approve_transaction(new_transaction_id) INTO result;
  
  -- Check if invoice already exists for this estimate
  SELECT id INTO new_invoice_id
  FROM public.invoices
  WHERE estimate_id = estimate_record.id;
  
  IF new_invoice_id IS NULL THEN
    -- Create invoice with the correct transaction number (matching estimate)
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
      invoice_number_val,
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
      transaction_number_val -- Use the correct transaction number matching estimate
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
      -- Determine home type based on width with correct crew types
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
      
      -- Insert delivery with correct transaction number
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
        'pending_scheduling',
        'WMH-D-' || base_transaction_number, -- Use same base number
        now() + interval '14 days',
        'WMH-D-' || base_transaction_number -- Consistent transaction number
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
        'pending_scheduling',
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