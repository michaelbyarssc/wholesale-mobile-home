-- Create delivery routes table for route optimization
CREATE TABLE public.delivery_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  optimized_route JSONB,
  total_distance_miles NUMERIC,
  estimated_duration_minutes INTEGER,
  traffic_conditions JSONB DEFAULT '{}'::jsonb,
  weather_conditions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery permits table
CREATE TABLE public.delivery_permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  permit_type TEXT NOT NULL,
  permit_number TEXT NOT NULL,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  document_url TEXT,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery insurance table
CREATE TABLE public.delivery_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  policy_number TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  coverage_type TEXT NOT NULL,
  coverage_amount NUMERIC,
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  premium_amount NUMERIC,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery receipts table
CREATE TABLE public.delivery_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_signature_url TEXT,
  driver_signature_url TEXT,
  items_delivered JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create damage inspections table
CREATE TABLE public.damage_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  inspection_type TEXT NOT NULL DEFAULT 'pre_delivery',
  inspector_id UUID,
  inspection_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  damage_found BOOLEAN NOT NULL DEFAULT false,
  damage_description TEXT,
  damage_photos JSONB DEFAULT '[]'::jsonb,
  severity_level TEXT,
  repair_required BOOLEAN DEFAULT false,
  repair_cost_estimate NUMERIC,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather alerts table
CREATE TABLE public.weather_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  affected_area TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  weather_data JSONB DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traffic conditions table
CREATE TABLE public.traffic_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID,
  delivery_id UUID,
  condition_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  affected_road TEXT,
  estimated_delay_minutes INTEGER,
  alternative_route_suggested BOOLEAN DEFAULT false,
  traffic_data JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery time slots table
CREATE TABLE public.delivery_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  delivery_type TEXT,
  service_area TEXT,
  price_modifier NUMERIC DEFAULT 1.0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create predictive analytics data table
CREATE TABLE public.predictive_analytics_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID,
  prediction_type TEXT NOT NULL,
  input_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  actual_outcome JSONB,
  accuracy_score NUMERIC,
  model_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cost analysis records table
CREATE TABLE public.cost_analysis_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fuel_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  vehicle_maintenance_cost NUMERIC DEFAULT 0,
  permit_cost NUMERIC DEFAULT 0,
  insurance_cost NUMERIC DEFAULT 0,
  overhead_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (
    COALESCE(fuel_cost, 0) + 
    COALESCE(labor_cost, 0) + 
    COALESCE(vehicle_maintenance_cost, 0) + 
    COALESCE(permit_cost, 0) + 
    COALESCE(insurance_cost, 0) + 
    COALESCE(overhead_cost, 0)
  ) STORED,
  revenue NUMERIC DEFAULT 0,
  profit_margin NUMERIC GENERATED ALWAYS AS (
    CASE WHEN COALESCE(revenue, 0) > 0 
    THEN ((COALESCE(revenue, 0) - (
      COALESCE(fuel_cost, 0) + 
      COALESCE(labor_cost, 0) + 
      COALESCE(vehicle_maintenance_cost, 0) + 
      COALESCE(permit_cost, 0) + 
      COALESCE(insurance_cost, 0) + 
      COALESCE(overhead_cost, 0)
    )) / COALESCE(revenue, 0)) * 100
    ELSE 0 
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow automations table
CREATE TABLE public.workflow_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency protocols table
CREATE TABLE public.emergency_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_name TEXT NOT NULL,
  emergency_type TEXT NOT NULL,
  severity_level TEXT NOT NULL,
  response_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documentation JSONB DEFAULT '[]'::jsonb,
  escalation_rules JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_analysis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_protocols ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins and drivers
CREATE POLICY "Admins can manage all delivery routes" ON public.delivery_routes
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view routes for their deliveries" ON public.delivery_routes
  FOR SELECT TO authenticated USING (
    is_driver_for_delivery(auth.uid(), delivery_id)
  );

CREATE POLICY "Admins can manage all permits" ON public.delivery_permits
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all insurance" ON public.delivery_insurance
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all receipts" ON public.delivery_receipts
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can create receipts for their deliveries" ON public.delivery_receipts
  FOR INSERT TO authenticated WITH CHECK (
    is_driver_for_delivery(auth.uid(), delivery_id)
  );

CREATE POLICY "Admins can manage all inspections" ON public.damage_inspections
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can create inspections for their deliveries" ON public.damage_inspections
  FOR INSERT TO authenticated WITH CHECK (
    is_driver_for_delivery(auth.uid(), delivery_id)
  );

CREATE POLICY "Anyone can view weather alerts" ON public.weather_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage weather alerts" ON public.weather_alerts
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view traffic conditions" ON public.traffic_conditions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage traffic conditions" ON public.traffic_conditions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view available time slots" ON public.delivery_time_slots
  FOR SELECT TO authenticated USING (available = true);

CREATE POLICY "Admins can manage time slots" ON public.delivery_time_slots
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all analytics data" ON public.predictive_analytics_data
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all cost analysis" ON public.cost_analysis_records
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage workflow automations" ON public.workflow_automations
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage emergency protocols" ON public.emergency_protocols
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_delivery_routes_delivery_id ON public.delivery_routes(delivery_id);
CREATE INDEX idx_delivery_permits_delivery_id ON public.delivery_permits(delivery_id);
CREATE INDEX idx_delivery_permits_expiry_date ON public.delivery_permits(expiry_date);
CREATE INDEX idx_delivery_insurance_delivery_id ON public.delivery_insurance(delivery_id);
CREATE INDEX idx_delivery_insurance_expiry_date ON public.delivery_insurance(expiry_date);
CREATE INDEX idx_delivery_receipts_delivery_id ON public.delivery_receipts(delivery_id);
CREATE INDEX idx_damage_inspections_delivery_id ON public.damage_inspections(delivery_id);
CREATE INDEX idx_weather_alerts_delivery_id ON public.weather_alerts(delivery_id);
CREATE INDEX idx_traffic_conditions_delivery_id ON public.traffic_conditions(delivery_id);
CREATE INDEX idx_delivery_time_slots_date ON public.delivery_time_slots(date);
CREATE INDEX idx_predictive_analytics_delivery_id ON public.predictive_analytics_data(delivery_id);
CREATE INDEX idx_cost_analysis_delivery_id ON public.cost_analysis_records(delivery_id);
CREATE INDEX idx_cost_analysis_date ON public.cost_analysis_records(analysis_date);