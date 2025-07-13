-- Create trigger to automatically create tracking sessions when deliveries are created
CREATE OR REPLACE FUNCTION create_tracking_session_for_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_order_id UUID;
  tracking_session_id UUID;
BEGIN
  -- Create a basic order record if one doesn't exist
  IF NEW.invoice_id IS NOT NULL THEN
    -- Try to find existing order through invoice
    SELECT o.id INTO new_order_id
    FROM orders o
    JOIN invoices i ON i.id = o.invoice_id
    WHERE i.id = NEW.invoice_id
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
      created_by
    ) VALUES (
      NEW.company_id,
      NEW.customer_name,
      NEW.customer_email,
      NEW.customer_phone,
      NEW.mobile_home_id,
      NEW.total_delivery_cost,
      'confirmed',
      NEW.created_by
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
$$;

-- Create trigger
CREATE TRIGGER trigger_create_tracking_session
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION create_tracking_session_for_delivery();

-- Function to send delivery notifications
CREATE OR REPLACE FUNCTION send_delivery_notifications(delivery_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  delivery_info RECORD;
  tracking_token TEXT;
  notification_result JSONB := '{"email_sent": false, "sms_sent": false}';
BEGIN
  -- Get delivery and tracking info
  SELECT 
    d.*,
    cts.session_token
  INTO delivery_info
  FROM deliveries d
  LEFT JOIN orders o ON o.id = (
    SELECT order_id FROM customer_tracking_sessions 
    WHERE order_id IN (
      SELECT id FROM orders WHERE customer_email = d.customer_email
    ) LIMIT 1
  )
  LEFT JOIN customer_tracking_sessions cts ON cts.order_id = o.id
  WHERE d.id = delivery_id_param;
  
  IF delivery_info.session_token IS NOT NULL THEN
    tracking_token := delivery_info.session_token;
    notification_result := jsonb_build_object(
      'tracking_token', tracking_token,
      'customer_email', delivery_info.customer_email,
      'customer_phone', delivery_info.customer_phone,
      'delivery_number', delivery_info.delivery_number
    );
  END IF;
  
  RETURN notification_result;
END;
$$;