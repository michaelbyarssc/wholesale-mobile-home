-- Fix record_invoice_payment_optimized to avoid calling missing generate_delivery_number()
-- and robustly derive base number from invoice_number formats like 'WMH-I-000123' or 'INV-000123'.

CREATE OR REPLACE FUNCTION public.record_invoice_payment_optimized(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_id UUID;
  new_balance NUMERIC;
  new_status TEXT;
  paid_at_timestamp TIMESTAMPTZ;
  invoice_record RECORD;
  new_delivery_id UUID;
  delivery_number_val TEXT;
  base_transaction_number TEXT;
  factory_address TEXT;
  factory_id_val UUID;
  width_feet_val NUMERIC;
  home_type_val mobile_home_type := 'single_wide';
  crew_type_val delivery_crew_type := 'single_driver';
BEGIN
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than 0');
  END IF;

  -- Load invoice with related estimate data
  SELECT 
    i.*, 
    e.delivery_address AS est_delivery_address,
    e.mobile_home_id AS est_mobile_home_id,
    e.customer_name AS est_customer_name,
    e.customer_email AS est_customer_email,
    e.customer_phone AS est_customer_phone
  INTO invoice_record
  FROM public.invoices i
  LEFT JOIN public.estimates e ON e.id = i.estimate_id
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Compute new balance
  new_balance := COALESCE(invoice_record.balance_due, invoice_record.total_amount) - p_amount;
  IF new_balance < 0 THEN new_balance := 0; END IF;

  -- Determine new status/paid_at
  IF new_balance = 0 THEN
    new_status := 'paid';
    paid_at_timestamp := now();
  ELSE
    new_status := COALESCE(invoice_record.status, 'sent');
    paid_at_timestamp := invoice_record.paid_at;
  END IF;

  -- Insert payment record
  INSERT INTO public.payments (
    invoice_id, amount, payment_date, payment_method, notes, created_by
  ) VALUES (
    p_invoice_id, p_amount, now(), p_payment_method, p_notes, auth.uid()
  ) RETURNING id INTO payment_id;

  -- Update invoice
  UPDATE public.invoices
  SET 
    balance_due = new_balance,
    status = new_status,
    paid_at = paid_at_timestamp,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- On full payment, create a delivery if none exists yet
  IF new_balance = 0 AND NOT EXISTS (SELECT 1 FROM public.deliveries d WHERE d.invoice_id = p_invoice_id) THEN
    -- Try to derive base transaction number from invoice_number
    -- Prefer third segment (WMH-I-000123). If missing, use second segment (INV-000123).
    base_transaction_number := NULLIF(split_part(invoice_record.invoice_number, '-', 3), '');
    IF base_transaction_number IS NULL THEN
      base_transaction_number := NULLIF(split_part(invoice_record.invoice_number, '-', 2), '');
    END IF;

    -- Fallback to generated base when still not present
    IF base_transaction_number IS NULL THEN
      base_transaction_number := public.generate_base_transaction_number();
    END IF;

    delivery_number_val := 'WMH-D-' || base_transaction_number;

    -- Get mobile home details and factory info for pickup
    SELECT 
      mh.width_feet,
      f.id AS factory_id,
      COALESCE(
        f.street_address || ', ' || f.city || ', ' || f.state || ' ' || f.zip_code,
        'Factory Address TBD'
      ) AS factory_address
    INTO width_feet_val, factory_id_val, factory_address
    FROM public.mobile_homes mh
    LEFT JOIN public.mobile_home_factories mhf ON mhf.mobile_home_id = mh.id
    LEFT JOIN public.factories f ON f.id = mhf.factory_id
    WHERE mh.id = COALESCE(invoice_record.est_mobile_home_id, invoice_record.mobile_home_id);

    -- Determine home/crew types (null-safe)
    IF width_feet_val IS NULL OR width_feet_val <= 16 THEN
      home_type_val := 'single_wide';
      crew_type_val := 'single_driver';
    ELSIF width_feet_val <= 20 THEN
      home_type_val := 'double_wide';
      crew_type_val := 'double_wide_crew';
    ELSE
      home_type_val := 'triple_wide';
      crew_type_val := 'triple_wide_crew';
    END IF;

    -- Insert delivery (NOTE: keep columns consistent with current schema)
    INSERT INTO public.deliveries (
      invoice_id,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      pickup_address,
      mobile_home_id,
      total_delivery_cost,
      mobile_home_type,
      crew_type,
      status,
      delivery_number,
      scheduled_delivery_date,
      factory_id,
      created_by,
      transaction_number
    ) VALUES (
      p_invoice_id,
      COALESCE(invoice_record.est_customer_name, invoice_record.customer_name),
      COALESCE(invoice_record.est_customer_email, invoice_record.customer_email),
      COALESCE(invoice_record.est_customer_phone, invoice_record.customer_phone),
      COALESCE(invoice_record.est_delivery_address, invoice_record.delivery_address, 'Delivery Address TBD'),
      factory_address,
      COALESCE(invoice_record.est_mobile_home_id, invoice_record.mobile_home_id),
      invoice_record.total_amount,
      home_type_val,
      crew_type_val,
      'scheduled',
      delivery_number_val,
      (CURRENT_DATE + INTERVAL '14 days')::date,
      factory_id_val,
      auth.uid(),
      delivery_number_val -- also store as transaction_number for reference
    ) RETURNING id INTO new_delivery_id;

    -- Status history
    INSERT INTO public.delivery_status_history (
      delivery_id, previous_status, new_status, changed_by, notes
    ) VALUES (
      new_delivery_id, NULL, 'scheduled', auth.uid(), 'Auto-created on invoice payment completion'
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;