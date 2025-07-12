-- Phase 1: Core Delivery Tracking System

-- Create enum types for delivery system
CREATE TYPE delivery_status AS ENUM (
  'pending_payment',
  'scheduled', 
  'factory_pickup_scheduled',
  'factory_pickup_in_progress',
  'factory_pickup_completed',
  'in_transit',
  'delivery_in_progress', 
  'delivered',
  'completed',
  'cancelled',
  'delayed'
);

CREATE TYPE mobile_home_type AS ENUM (
  'single_wide',
  'double_wide', 
  'triple_wide'
);

CREATE TYPE delivery_crew_type AS ENUM (
  'single_driver',
  'double_wide_crew',
  'triple_wide_crew'
);

CREATE TYPE driver_status AS ENUM (
  'available',
  'on_delivery',
  'off_duty',
  'inactive'
);

-- Drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status driver_status NOT NULL DEFAULT 'available',
  license_number TEXT,
  license_expiry DATE,
  cdl_class TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hourly_rate NUMERIC(8,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Driver vehicles table
CREATE TABLE public.driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL, -- 'truck', 'escort_vehicle', 'pilot_car'
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  insurance_policy TEXT,
  insurance_expiry DATE,
  dot_number TEXT,
  registration_expiry DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id),
  mobile_home_id UUID REFERENCES public.mobile_homes(id),
  delivery_number TEXT UNIQUE NOT NULL,
  status delivery_status NOT NULL DEFAULT 'pending_payment',
  mobile_home_type mobile_home_type NOT NULL,
  crew_type delivery_crew_type NOT NULL,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Delivery addresses
  pickup_address TEXT NOT NULL, -- Factory address
  delivery_address TEXT NOT NULL, -- Customer delivery address
  
  -- Scheduling
  scheduled_pickup_date DATE,
  scheduled_delivery_date DATE,
  actual_pickup_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  
  -- Factory information
  factory_id UUID REFERENCES public.factories(id),
  factory_notification_date TIMESTAMP WITH TIME ZONE,
  factory_ready_date TIMESTAMP WITH TIME ZONE,
  
  -- Special requirements
  permits_required BOOLEAN DEFAULT false,
  escort_required BOOLEAN DEFAULT false,
  special_instructions TEXT,
  route_restrictions TEXT,
  
  -- Costs
  delivery_cost NUMERIC(10,2),
  mileage_cost NUMERIC(10,2),
  permit_cost NUMERIC(10,2),
  total_delivery_cost NUMERIC(10,2),
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  customer_signature_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Delivery assignments table (supports multiple drivers per delivery)
CREATE TABLE public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary', -- 'primary', 'secondary', 'escort'
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  hours_logged NUMERIC(5,2),
  mileage_logged NUMERIC(8,2),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(delivery_id, driver_id, role)
);

-- GPS tracking table
CREATE TABLE public.delivery_gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(6,2),
  speed_mph NUMERIC(5,2),
  heading NUMERIC(5,2),
  address TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  battery_level INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Delivery photos table
CREATE TABLE public.delivery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'pickup_front', 'pickup_back', 'pickup_left', 'pickup_right', 'delivery_front', 'delivery_back', 'delivery_left', 'delivery_right', 'repair_needed'
  caption TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery status history table
CREATE TABLE public.delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  previous_status delivery_status,
  new_status delivery_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Driver performance metrics table
CREATE TABLE public.driver_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  on_time_pickup BOOLEAN,
  on_time_delivery BOOLEAN,
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  total_hours NUMERIC(5,2),
  total_mileage NUMERIC(8,2),
  fuel_cost NUMERIC(8,2),
  completion_rating INTEGER CHECK (completion_rating >= 1 AND completion_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for delivery numbers
CREATE SEQUENCE delivery_number_seq START 1000;

-- Function to generate delivery numbers
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'DEL-' || LPAD(nextval('delivery_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate delivery numbers
CREATE OR REPLACE FUNCTION auto_generate_delivery_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_number IS NULL THEN
    NEW.delivery_number := generate_delivery_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_generate_delivery_number
  BEFORE INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_delivery_number();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_assignments_updated_at
  BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers
CREATE POLICY "Admins can manage all drivers" ON public.drivers
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their own profile" ON public.drivers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own profile" ON public.drivers
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for driver_vehicles
CREATE POLICY "Admins can manage all vehicles" ON public.driver_vehicles
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their own vehicles" ON public.driver_vehicles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_vehicles.driver_id AND user_id = auth.uid())
  );

-- RLS Policies for deliveries
CREATE POLICY "Super admins can view all deliveries" ON public.deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Admins can view their assigned deliveries" ON public.deliveries
  FOR SELECT USING (
    is_admin(auth.uid()) AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.delivery_assignments da
        JOIN public.drivers d ON da.driver_id = d.id
        WHERE da.delivery_id = deliveries.id AND d.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Drivers can view their assigned deliveries" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments da
      JOIN public.drivers d ON da.driver_id = d.id
      WHERE da.delivery_id = deliveries.id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage deliveries" ON public.deliveries
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for delivery_assignments
CREATE POLICY "Admins can manage all assignments" ON public.delivery_assignments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their assignments" ON public.delivery_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = delivery_assignments.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can update their assignments" ON public.delivery_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = delivery_assignments.driver_id AND user_id = auth.uid())
  );

-- RLS Policies for GPS tracking
CREATE POLICY "Admins can view all GPS data" ON public.delivery_gps_tracking
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can insert their GPS data" ON public.delivery_gps_tracking
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = delivery_gps_tracking.driver_id AND user_id = auth.uid())
  );

CREATE POLICY "Drivers can view their GPS data" ON public.delivery_gps_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = delivery_gps_tracking.driver_id AND user_id = auth.uid())
  );

-- RLS Policies for delivery photos
CREATE POLICY "Admins can manage all photos" ON public.delivery_photos
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can manage their photos" ON public.delivery_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = delivery_photos.driver_id AND user_id = auth.uid())
  );

-- RLS Policies for delivery status history
CREATE POLICY "Admins can view all status history" ON public.delivery_status_history
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert status history" ON public.delivery_status_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for driver performance
CREATE POLICY "Admins can manage all performance data" ON public.driver_performance
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their performance" ON public.driver_performance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_performance.driver_id AND user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_customer_email ON public.deliveries(customer_email);
CREATE INDEX idx_deliveries_scheduled_dates ON public.deliveries(scheduled_pickup_date, scheduled_delivery_date);
CREATE INDEX idx_delivery_assignments_driver ON public.delivery_assignments(driver_id);
CREATE INDEX idx_delivery_assignments_delivery ON public.delivery_assignments(delivery_id);
CREATE INDEX idx_delivery_gps_tracking_delivery ON public.delivery_gps_tracking(delivery_id);
CREATE INDEX idx_delivery_gps_tracking_timestamp ON public.delivery_gps_tracking(timestamp);
CREATE INDEX idx_delivery_photos_delivery ON public.delivery_photos(delivery_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_user_id ON public.drivers(user_id);