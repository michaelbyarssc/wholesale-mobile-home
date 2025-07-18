-- Fix the create_tracking_session_for_delivery trigger to ensure company_id is set
CREATE OR REPLACE FUNCTION public.create_tracking_session_for_delivery()
RETURNS trigger AS $$
DECLARE
  new_order_id UUID;
  tracking_session_id UUID;
  default_company_id UUID;
BEGIN
  -- Get or create default company
  SELECT id INTO default_company_id
  FROM companies
  WHERE name = 'Default Company'
  LIMIT 1;

  IF default_company_id IS NULL THEN
    INSERT INTO companies (name, active, created_by)
    VALUES ('Default Company', true, COALESCE(NEW.created_by, auth.uid()))
    RETURNING id INTO default_company_id;
  END IF;

  -- Create a basic order record if one doesn't exist
  IF NEW.invoice_id IS NOT NULL THEN
    -- Try to find existing order through invoice->estimate relationship
    SELECT o.id INTO new_order_id
    FROM orders o
    WHERE o.estimate_id IN (
      SELECT i.estimate_id 
      FROM invoices i 
      WHERE i.id = NEW.invoice_id
    )
    LIMIT 1;
  END IF;
  
  -- If no order found, create a minimal one for tracking purposes
  IF new_order_id IS NULL THEN
    INSERT INTO orders (
      company_id,
      customer_name,
      customer_email, 
      customer_phone,
      mobile_home_id,
      total_value,
      status,
      created_by,
      estimate_id
    ) VALUES (
      COALESCE(NEW.company_id, default_company_id), -- Use NEW.company_id if set, otherwise default
      NEW.customer_name,
      NEW.customer_email,
      NEW.customer_phone,
      NEW.mobile_home_id,
      NEW.total_delivery_cost,
      'confirmed',
      COALESCE(NEW.created_by, auth.uid()),
      (SELECT estimate_id FROM invoices WHERE id = NEW.invoice_id)
    ) RETURNING id INTO new_order_id;
  END IF;
  
  -- Create tracking session
  INSERT INTO customer_tracking_sessions (
    order_id,
    session_token,
    expires_at,
    active
  ) VALUES (
    new_order_id,
    generate_tracking_token(),
    now() + interval '90 days', -- Token valid for 90 days
    true
  ) RETURNING id INTO tracking_session_id;
  
  -- Log the creation
  INSERT INTO delivery_status_history (
    delivery_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    NEW.id,
    NULL,
    NEW.status,
    COALESCE(NEW.created_by, auth.uid()),
    'Delivery created with tracking session: ' || tracking_session_id::TEXT
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;