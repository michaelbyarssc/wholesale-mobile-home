-- Fix the approve_estimate function to use correct transaction numbering
CREATE OR REPLACE FUNCTION public.approve_estimate(estimate_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  base_number TEXT;
  invoice_number_val TEXT;
  result jsonb;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estimate not found');
  END IF;
  
  -- Check if already approved
  IF estimate_record.approved_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estimate already approved');
  END IF;
  
  -- Extract base number from estimate's transaction number
  base_number := extract_base_transaction_number(estimate_record.transaction_number);
  
  -- Generate invoice number using the same base number
  invoice_number_val := 'WMH-I-' || base_number;
  
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