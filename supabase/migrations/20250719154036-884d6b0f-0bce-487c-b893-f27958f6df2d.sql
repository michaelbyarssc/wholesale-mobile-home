-- Fix delivery number generation to use consistent transaction ID
-- Instead of generating new numbers, extract base number from invoice

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
    
    -- Determine home type based on width
    IF home_record.width_feet <= 16 THEN
      home_type := 'single_wide';
      crew_type := 'single_wide_crew';
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