-- Complete database functions and triggers

-- Database functions for the enhanced system

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 8, '0');
END;
$function$;

-- Create order number sequence
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Auto-generate order number trigger
CREATE OR REPLACE FUNCTION public.auto_generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_order_number_trigger ON public.orders;
CREATE TRIGGER auto_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION auto_generate_order_number();

-- Generate tracking session token
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'track_' || encode(gen_random_bytes(20), 'base64url');
END;
$function$;

-- Auto-generate tracking token trigger
CREATE OR REPLACE FUNCTION public.auto_generate_tracking_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.session_token IS NULL THEN
    NEW.session_token := generate_tracking_token();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_tracking_token_trigger ON public.customer_tracking_sessions;
CREATE TRIGGER auto_tracking_token_trigger
  BEFORE INSERT ON public.customer_tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_generate_tracking_token();

-- Calculate delivery ETA based on current GPS location
CREATE OR REPLACE FUNCTION public.calculate_delivery_eta(
  delivery_id_param UUID,
  current_lat NUMERIC,
  current_lng NUMERIC
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  delivery_address_text TEXT;
  estimated_minutes INTEGER;
  average_speed_mph NUMERIC := 45; -- Default highway speed
BEGIN
  -- Get delivery address
  SELECT delivery_address INTO delivery_address_text
  FROM deliveries
  WHERE id = delivery_id_param;

  -- Simple distance calculation (would use Google Maps API in production)
  -- For now, estimate 1 degree = ~69 miles, calculate rough distance
  estimated_minutes := (
    SQRT(
      POW((current_lat - 40.7128), 2) + 
      POW((current_lng - (-74.0060)), 2)
    ) * 69 / average_speed_mph * 60
  )::INTEGER;

  RETURN now() + (estimated_minutes || ' minutes')::INTERVAL;
END;
$function$;

-- Sync offline GPS data
CREATE OR REPLACE FUNCTION public.sync_offline_gps_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  synced_count INTEGER := 0;
BEGIN
  -- Update delivery_gps_tracking with offline data
  INSERT INTO delivery_gps_tracking (
    delivery_id, driver_id, latitude, longitude, 
    accuracy_meters, speed_mph, heading, battery_level, timestamp
  )
  SELECT 
    delivery_id, driver_id, latitude, longitude,
    accuracy_meters, speed_mph, heading, battery_level, recorded_at
  FROM gps_tracking_offline
  WHERE synced_at IS NULL;

  GET DIAGNOSTICS synced_count = ROW_COUNT;

  -- Mark as synced
  UPDATE gps_tracking_offline
  SET synced_at = now()
  WHERE synced_at IS NULL;

  RETURN synced_count;
END;
$function$;

-- Process factory email parsing
CREATE OR REPLACE FUNCTION public.process_factory_email(
  factory_id_param UUID,
  email_subject TEXT,
  email_content TEXT,
  sender_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  parsing_rules JSONB;
  confidence_score NUMERIC := 0;
  parsed_data JSONB := '{}';
  communication_id UUID;
  delivery_id_found UUID;
BEGIN
  -- Get parsing rules for factory
  SELECT fep.parsing_rules INTO parsing_rules
  FROM factory_email_parsing fep
  WHERE fep.factory_id = factory_id_param AND fep.active = true;

  -- Extract delivery ID from subject or content
  SELECT id INTO delivery_id_found
  FROM deliveries d
  WHERE d.factory_id = factory_id_param
  AND (
    email_subject ILIKE '%' || d.delivery_number || '%' OR
    email_content ILIKE '%' || d.delivery_number || '%'
  )
  LIMIT 1;

  -- Parse status updates based on keywords
  IF email_content ILIKE '%confirmed%' OR email_subject ILIKE '%confirmed%' THEN
    parsed_data := jsonb_build_object('status', 'confirmed', 'confidence', 0.8);
    confidence_score := 0.8;
  ELSIF email_content ILIKE '%ready%' OR email_subject ILIKE '%ready%' THEN
    parsed_data := jsonb_build_object('status', 'ready_for_pickup', 'confidence', 0.9);
    confidence_score := 0.9;
  ELSIF email_content ILIKE '%delayed%' OR email_subject ILIKE '%delayed%' THEN
    parsed_data := jsonb_build_object('status', 'delayed', 'confidence', 0.7);
    confidence_score := 0.7;
  END IF;

  -- Insert factory communication record
  INSERT INTO factory_communications (
    factory_id, delivery_id, communication_type, subject, content,
    parsed_data, confidence_score, status
  ) VALUES (
    factory_id_param, delivery_id_found, 'email', email_subject, email_content,
    parsed_data, confidence_score, 'pending_review'
  ) RETURNING id INTO communication_id;

  RETURN communication_id;
END;
$function$;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_pieces_updated_at ON public.delivery_pieces;
CREATE TRIGGER update_delivery_pieces_updated_at
  BEFORE UPDATE ON public.delivery_pieces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_factory_templates_updated_at ON public.factory_templates;
CREATE TRIGGER update_factory_templates_updated_at
  BEFORE UPDATE ON public.factory_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repair_requests_updated_at ON public.repair_requests;
CREATE TRIGGER update_repair_requests_updated_at
  BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to send notifications based on delivery status changes
CREATE OR REPLACE FUNCTION public.trigger_delivery_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_rule RECORD;
  order_info RECORD;
BEGIN
  -- Get order information
  SELECT o.*, c.name as company_name
  INTO order_info
  FROM orders o
  LEFT JOIN companies c ON o.company_id = c.id
  WHERE o.id = (
    SELECT order_id FROM deliveries WHERE id = NEW.delivery_id LIMIT 1
  );

  -- Find applicable notification rules
  FOR notification_rule IN 
    SELECT * FROM notification_rules nr
    WHERE nr.active = true
    AND nr.company_id = order_info.company_id
    AND (
      (nr.trigger_event = 'delivery_started' AND NEW.new_status = 'in_transit') OR
      (nr.trigger_event = 'delivery_completed' AND NEW.new_status = 'completed') OR
      (nr.trigger_event = 'delivery_delayed' AND NEW.new_status = 'delayed')
    )
  LOOP
    -- Insert notification log entry
    INSERT INTO notification_logs (
      notification_rule_id, delivery_id, order_id,
      recipient_email, recipient_phone, notification_type,
      content, status
    ) VALUES (
      notification_rule.id, NEW.delivery_id, order_info.id,
      order_info.customer_email, order_info.customer_phone,
      notification_rule.notification_type,
      notification_rule.template_content, 'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger for delivery status changes
DROP TRIGGER IF EXISTS delivery_status_notification_trigger ON public.delivery_status_history;
CREATE TRIGGER delivery_status_notification_trigger
  AFTER INSERT ON public.delivery_status_history
  FOR EACH ROW EXECUTE FUNCTION trigger_delivery_notifications();

-- Function to create order from approved estimate with all relationships
CREATE OR REPLACE FUNCTION public.create_order_from_estimate(estimate_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  estimate_record RECORD;
  new_order_id UUID;
  new_invoice_id UUID;
  new_delivery_id UUID;
  default_company_id UUID;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Get or create default company (for backward compatibility)
  SELECT id INTO default_company_id
  FROM companies
  WHERE name = 'Default Company'
  LIMIT 1;

  IF default_company_id IS NULL THEN
    INSERT INTO companies (name, active, created_by)
    VALUES ('Default Company', true, auth.uid())
    RETURNING id INTO default_company_id;
  END IF;

  -- Create order
  INSERT INTO public.orders (
    company_id, customer_name, customer_email, customer_phone,
    user_id, mobile_home_id, estimate_id, total_value,
    payment_terms, status, created_by
  ) VALUES (
    default_company_id, estimate_record.customer_name,
    estimate_record.customer_email, estimate_record.customer_phone,
    estimate_record.user_id, estimate_record.mobile_home_id,
    estimate_record.id, estimate_record.total_amount,
    'Net 30', 'pending', auth.uid()
  ) RETURNING id INTO new_order_id;

  -- Call existing approve_estimate function to create invoice and delivery
  SELECT approve_estimate(estimate_uuid) INTO new_invoice_id;

  -- Update the delivery with the order relationship
  UPDATE deliveries 
  SET company_id = default_company_id
  WHERE invoice_id = new_invoice_id;

  RETURN new_order_id;
END;
$function$;