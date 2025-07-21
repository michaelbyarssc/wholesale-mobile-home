-- Add new delivery status types for the two-phase scheduling system
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'awaiting_pickup_schedule';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_scheduled';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_in_progress';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_completed';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'awaiting_delivery_schedule';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'delivery_scheduled';

-- Create delivery_schedules table for the two-phase system
CREATE TABLE IF NOT EXISTS public.delivery_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  
  -- Phase 1: Factory Pickup Scheduling
  pickup_scheduled_date TIMESTAMP WITH TIME ZONE,
  pickup_scheduled_time_start TIME,
  pickup_scheduled_time_end TIME,
  pickup_driver_id UUID REFERENCES public.drivers(id),
  pickup_timezone TEXT,
  pickup_confirmed_at TIMESTAMP WITH TIME ZONE,
  pickup_started_at TIMESTAMP WITH TIME ZONE,
  pickup_completed_at TIMESTAMP WITH TIME ZONE,
  pickup_photos TEXT[], -- Array of photo URLs
  pickup_signature_url TEXT,
  pickup_notes TEXT,
  
  -- Phase 2: Customer Delivery Scheduling  
  delivery_scheduled_date TIMESTAMP WITH TIME ZONE,
  delivery_scheduled_time_start TIME,
  delivery_scheduled_time_end TIME,
  delivery_driver_id UUID REFERENCES public.drivers(id),
  delivery_timezone TEXT,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  delivery_started_at TIMESTAMP WITH TIME ZONE,
  delivery_completed_at TIMESTAMP WITH TIME ZONE,
  delivery_photos TEXT[], -- Array of photo URLs
  delivery_signature_url TEXT,
  delivery_notes TEXT,
  
  -- Repair documentation
  repair_photos TEXT[], -- Array of repair photo URLs
  repair_notes TEXT,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT valid_pickup_schedule CHECK (
    (pickup_scheduled_date IS NULL AND pickup_scheduled_time_start IS NULL AND pickup_scheduled_time_end IS NULL) OR
    (pickup_scheduled_date IS NOT NULL AND pickup_scheduled_time_start IS NOT NULL AND pickup_scheduled_time_end IS NOT NULL)
  ),
  CONSTRAINT valid_delivery_schedule CHECK (
    (delivery_scheduled_date IS NULL AND delivery_scheduled_time_start IS NULL AND delivery_scheduled_time_end IS NULL) OR
    (delivery_scheduled_date IS NOT NULL AND delivery_scheduled_time_start IS NOT NULL AND delivery_scheduled_time_end IS NOT NULL)
  ),
  CONSTRAINT pickup_before_delivery CHECK (
    pickup_scheduled_date IS NULL OR delivery_scheduled_date IS NULL OR pickup_scheduled_date <= delivery_scheduled_date
  )
);

-- Create delivery_gps_tracking table for real-time GPS tracking
CREATE TABLE IF NOT EXISTS public.delivery_gps_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters INTEGER,
  speed_mph DECIMAL(5, 2),
  heading INTEGER, -- 0-359 degrees
  battery_level INTEGER, -- 0-100 percentage
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for delivery_gps_tracking
CREATE INDEX IF NOT EXISTS idx_delivery_gps_delivery_timestamp 
  ON public.delivery_gps_tracking(delivery_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_delivery_gps_driver_timestamp 
  ON public.delivery_gps_tracking(driver_id, timestamp);

-- Create driver_sessions table for mobile driver authentication
CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for driver_sessions
CREATE INDEX IF NOT EXISTS idx_driver_sessions_token 
  ON public.driver_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_phone 
  ON public.driver_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_active 
  ON public.driver_sessions(driver_id, active);

-- Create delivery_notifications table for automated notifications
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'pickup_scheduled', 'delivery_scheduled', 'pickup_started', 'delivery_started', 'pickup_completed', 'delivery_completed'
  recipient_type TEXT NOT NULL, -- 'customer', 'admin', 'driver'
  recipient_identifier TEXT NOT NULL, -- email, phone number, or user_id
  message_content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT NOT NULL, -- 'email', 'sms', 'push'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for delivery_notifications
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_scheduled 
  ON public.delivery_notifications(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_delivery 
  ON public.delivery_notifications(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_type_status 
  ON public.delivery_notifications(notification_type, status);

-- Create trigger for updated_at on delivery_schedules
CREATE OR REPLACE FUNCTION update_delivery_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_schedules_updated_at
  BEFORE UPDATE ON public.delivery_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_schedules_updated_at();

-- Create function to generate driver session tokens
CREATE OR REPLACE FUNCTION generate_driver_session_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'drv_' || replace(gen_random_uuid()::text, '-', '');
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create delivery when invoice balance = 0
CREATE OR REPLACE FUNCTION check_invoice_paid_create_delivery()
RETURNS TRIGGER AS $$
DECLARE
  existing_delivery_id UUID;
  new_delivery_id UUID;
  mobile_home_record RECORD;
BEGIN
  -- Only proceed if balance_due becomes 0 or null (paid)
  IF NEW.balance_due IS NOT NULL AND NEW.balance_due > 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check if balance was previously > 0 (avoid duplicate triggers)
  IF OLD.balance_due IS NULL OR OLD.balance_due <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check if delivery already exists for this invoice
  SELECT id INTO existing_delivery_id 
  FROM public.deliveries 
  WHERE invoice_id = NEW.id;
  
  IF existing_delivery_id IS NOT NULL THEN
    -- Update existing delivery status
    UPDATE public.deliveries 
    SET status = 'awaiting_pickup_schedule'::delivery_status,
        updated_at = now()
    WHERE id = existing_delivery_id;
    RETURN NEW;
  END IF;
  
  -- Get mobile home and factory information
  SELECT mh.*, f.name as factory_name, f.address as factory_address, f.id as factory_id
  INTO mobile_home_record
  FROM mobile_homes mh
  LEFT JOIN factories f ON f.id = mh.factory_id
  WHERE mh.id = NEW.mobile_home_id;
  
  -- Create new delivery record
  INSERT INTO public.deliveries (
    invoice_id,
    estimate_id,
    mobile_home_id,
    factory_id,
    customer_name,
    customer_email,
    customer_phone,
    pickup_address,
    delivery_address,
    mobile_home_type,
    crew_type,
    status,
    total_delivery_cost,
    created_by,
    company_id
  ) VALUES (
    NEW.id,
    NEW.estimate_id,
    NEW.mobile_home_id,
    mobile_home_record.factory_id,
    NEW.customer_name,
    NEW.customer_email,
    NEW.customer_phone,
    COALESCE(mobile_home_record.factory_address, 'Factory Address TBD'),
    NEW.delivery_address,
    COALESCE(mobile_home_record.type, 'single_wide'),
    'standard', -- Default crew type
    'awaiting_pickup_schedule'::delivery_status,
    0, -- Will be calculated later
    auth.uid(),
    mobile_home_record.company_id
  ) RETURNING id INTO new_delivery_id;
  
  -- Create initial delivery schedule record
  INSERT INTO public.delivery_schedules (
    delivery_id,
    created_by
  ) VALUES (
    new_delivery_id,
    auth.uid()
  );
  
  -- Create notification for admin to schedule pickup
  INSERT INTO public.delivery_notifications (
    delivery_id,
    notification_type,
    recipient_type,
    recipient_identifier,
    message_content,
    delivery_method,
    scheduled_for
  ) VALUES (
    new_delivery_id,
    'schedule_required',
    'admin',
    'admin',
    'New delivery needs to be scheduled. Invoice ' || NEW.invoice_number || ' has been paid in full.',
    'email',
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on invoices for automatic delivery creation
DROP TRIGGER IF EXISTS trigger_invoice_paid_create_delivery ON public.invoices;
CREATE TRIGGER trigger_invoice_paid_create_delivery
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_paid_create_delivery();

-- Enable RLS policies
ALTER TABLE public.delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_schedules
CREATE POLICY "Admins can manage all delivery schedules"
  ON public.delivery_schedules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their assigned delivery schedules"
  ON public.delivery_schedules FOR SELECT
  USING (
    pickup_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    ) OR
    delivery_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their delivery schedules"
  ON public.delivery_schedules FOR UPDATE
  USING (
    pickup_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    ) OR
    delivery_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for delivery_gps_tracking
CREATE POLICY "Admins can view all GPS tracking"
  ON public.delivery_gps_tracking FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can insert their own GPS data"
  ON public.delivery_gps_tracking FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view their own GPS data"
  ON public.delivery_gps_tracking FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for driver_sessions
CREATE POLICY "Drivers can manage their own sessions"
  ON public.driver_sessions FOR ALL
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all driver sessions"
  ON public.driver_sessions FOR SELECT
  USING (is_admin(auth.uid()));

-- RLS Policies for delivery_notifications
CREATE POLICY "Admins can manage all delivery notifications"
  ON public.delivery_notifications FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view notifications for their deliveries"
  ON public.delivery_notifications FOR SELECT
  USING (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      WHERE d.customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );