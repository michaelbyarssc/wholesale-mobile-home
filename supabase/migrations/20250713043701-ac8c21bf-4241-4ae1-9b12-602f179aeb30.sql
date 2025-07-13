-- Create RLS policies for multi-tenant delivery tracking system

-- Companies policies (Super admins can see all, admins see their own)
CREATE POLICY "Super admins can manage all companies" ON public.companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view their company" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT company_id FROM deliveries d
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Orders policies (based on company access)
CREATE POLICY "Super admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage orders for their drivers" ON public.orders
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT company_id FROM drivers
      WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id OR 
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Delivery pieces policies
CREATE POLICY "Super admins can manage all delivery pieces" ON public.delivery_pieces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage pieces for their deliveries" ON public.delivery_pieces
  FOR ALL USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Drivers can view pieces for their deliveries" ON public.delivery_pieces
  FOR SELECT USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.user_id = auth.uid()
    )
  );

-- GPS tracking policies
CREATE POLICY "Drivers can manage their GPS data" ON public.gps_tracking_offline
  FOR ALL USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view GPS data for their drivers" ON public.gps_tracking_offline
  FOR SELECT USING (
    driver_id IN (
      SELECT id FROM drivers WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Customer tracking sessions policies
CREATE POLICY "Customers can manage their tracking sessions" ON public.customer_tracking_sessions
  FOR ALL USING (
    auth.uid() = customer_user_id OR
    order_id IN (
      SELECT id FROM orders WHERE customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view tracking sessions for their orders" ON public.customer_tracking_sessions
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN deliveries d ON o.id = d.invoice_id
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Factory templates policies
CREATE POLICY "Admins can manage factory templates" ON public.factory_templates
  FOR ALL USING (
    factory_id IN (
      SELECT id FROM factories WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Factory communications policies
CREATE POLICY "Admins can manage factory communications" ON public.factory_communications
  FOR ALL USING (
    factory_id IN (
      SELECT id FROM factories WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Repair requests policies
CREATE POLICY "All authenticated users can create repair requests" ON public.repair_requests
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can manage repair requests for their deliveries" ON public.repair_requests
  FOR ALL USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Notification rules policies
CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT company_id FROM drivers WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Notification logs policies (admin view only)
CREATE POLICY "Admins can view notification logs" ON public.notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Calendar integrations policies
CREATE POLICY "Users can manage their calendar integrations" ON public.calendar_integrations
  FOR ALL USING (auth.uid() = user_id);

-- Payment records policies
CREATE POLICY "Admins can manage payment records" ON public.payment_records
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.company_id IN (
        SELECT DISTINCT company_id FROM drivers WHERE created_by = auth.uid()
      )
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Report templates policies
CREATE POLICY "Admins can manage report templates" ON public.report_templates
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT company_id FROM drivers WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Delivery analytics policies
CREATE POLICY "Admins can view analytics for their companies" ON public.delivery_analytics
  FOR SELECT USING (
    company_id IN (
      SELECT DISTINCT company_id FROM drivers WHERE created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

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
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_pieces_updated_at
  BEFORE UPDATE ON public.delivery_pieces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factory_templates_updated_at
  BEFORE UPDATE ON public.factory_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_requests_updated_at
  BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();