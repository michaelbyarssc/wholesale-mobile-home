-- Fix the approve_estimate function to use correct delivery status enum value
CREATE OR REPLACE FUNCTION public.approve_estimate(estimate_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  invoice_number_val TEXT;
  result jsonb;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND approved_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estimate not found or already approved');
  END IF;
  
  -- Generate invoice number
  invoice_number_val := 'WMH-I-' || LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
  
  -- Create invoice from estimate
  INSERT INTO public.invoices (
    estimate_id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    mobile_home_id,
    selected_services,
    selected_home_options,
    total_amount,
    balance_due,
    due_date,
    status,
    user_id,
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
    estimate_record.mobile_home_id,
    estimate_record.selected_services,
    estimate_record.selected_home_options,
    estimate_record.total_amount,
    estimate_record.total_amount, -- balance_due = total_amount initially
    CURRENT_DATE + INTERVAL '30 days', -- due in 30 days
    'pending',
    estimate_record.user_id,
    estimate_record.preferred_contact,
    estimate_record.timeline,
    estimate_record.additional_requirements,
    invoice_number_val
  ) RETURNING id INTO new_invoice_id;
  
  -- Update estimate to mark as approved
  UPDATE public.estimates
  SET 
    status = 'approved',
    approved_at = now(),
    updated_at = now(),
    invoice_id = new_invoice_id
  WHERE id = estimate_uuid;
  
  result := jsonb_build_object(
    'success', true,
    'invoice_id', new_invoice_id,
    'invoice_number', invoice_number_val,
    'estimate_id', estimate_uuid
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;