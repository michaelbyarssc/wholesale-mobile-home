
-- Fix the search_path security warnings for the database functions
-- This ensures the functions use a fixed search path for security

-- Update the generate_invoice_number function to set search_path
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the approve_estimate function to set search_path  
CREATE OR REPLACE FUNCTION approve_estimate(estimate_uuid UUID)
RETURNS UUID AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  new_invoice_number TEXT;
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
  
  -- Create invoice
  INSERT INTO public.invoices (
    estimate_id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    total_amount,
    user_id
  ) VALUES (
    estimate_record.id,
    new_invoice_number,
    estimate_record.customer_name,
    estimate_record.customer_email,
    estimate_record.customer_phone,
    estimate_record.delivery_address,
    estimate_record.total_amount,
    estimate_record.user_id
  ) RETURNING id INTO new_invoice_id;
  
  -- Update estimate
  UPDATE public.estimates
  SET 
    approved_at = now(),
    status = 'approved',
    invoice_id = new_invoice_id,
    updated_at = now()
  WHERE id = estimate_uuid;
  
  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
