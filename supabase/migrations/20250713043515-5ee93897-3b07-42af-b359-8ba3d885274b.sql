-- Create enhanced multi-tenant delivery tracking system

-- Create companies table for multi-tenant architecture
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create orders table as master transaction entity
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  mobile_home_id UUID REFERENCES public.mobile_homes(id),
  estimate_id UUID REFERENCES public.estimates(id),
  total_value NUMERIC NOT NULL DEFAULT 0,
  payment_terms TEXT,
  payment_percentage_required NUMERIC DEFAULT 100,
  delivery_radius_limit NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enhanced delivery pieces table for multi-component tracking
CREATE TABLE public.delivery_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  piece_number INTEGER NOT NULL,
  vin_number TEXT,
  mso_number TEXT,
  piece_type TEXT NOT NULL, -- 'single', 'double_left', 'double_right', 'triple_left', 'triple_center', 'triple_right'
  dimensions JSONB, -- width, length, height
  weight NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced GPS tracking with offline capabilities
CREATE TABLE public.gps_tracking_offline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_meters NUMERIC,
  speed_mph NUMERIC,
  heading NUMERIC,
  battery_level NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  is_offline BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Real-time customer tracking sessions
CREATE TABLE public.customer_tracking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_user_id UUID REFERENCES auth.users(id),
  session_token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_viewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Factory templates and communication
CREATE TABLE public.factory_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id),
  template_type TEXT NOT NULL, -- 'purchase_order', 'confirmation', 'pickup_notice'
  template_content TEXT NOT NULL,
  pdf_template_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Factory email parsing configuration
CREATE TABLE public.factory_email_parsing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id),
  email_address TEXT NOT NULL,
  parsing_rules JSONB NOT NULL, -- keywords and patterns for status updates
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parsed factory communications
CREATE TABLE public.factory_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  order_id UUID REFERENCES public.orders(id),
  communication_type TEXT NOT NULL, -- 'email', 'manual', 'api'
  subject TEXT,
  content TEXT,
  parsed_data JSONB,
  confidence_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery checklists (customizable per delivery type)
CREATE TABLE public.delivery_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_type TEXT NOT NULL, -- 'single_wide', 'double_wide', 'triple_wide'
  company_id UUID REFERENCES public.companies(id),
  checklist_items JSONB NOT NULL, -- array of checklist items
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Delivery checklist completions
CREATE TABLE public.delivery_checklist_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id),
  checklist_id UUID NOT NULL REFERENCES public.delivery_checklists(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  completed_items JSONB NOT NULL, -- array of completed item IDs with timestamps
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repair requests and workflow
CREATE TABLE public.repair_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id),
  delivery_piece_id UUID REFERENCES public.delivery_pieces(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  factory_id UUID REFERENCES public.factories(id),
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  issue_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  repair_type TEXT, -- 'cosmetic', 'structural', 'electrical', 'plumbing'
  photos JSONB, -- array of photo URLs
  estimated_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'reported', -- 'reported', 'factory_notified', 'scheduled', 'in_progress', 'completed', 'customer_approved'
  factory_notified_at TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  customer_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification rules and configuration
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'delivery_started', 'delivery_1_hour', 'delivery_30_min', etc.
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'all'
  template_content TEXT NOT NULL,
  delay_minutes INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  recipients JSONB, -- array of recipient types: 'customer', 'admin', 'super_admin', 'driver'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Notification logs
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_rule_id UUID REFERENCES public.notification_rules(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  order_id UUID REFERENCES public.orders(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_user_id UUID REFERENCES auth.users(id),
  notification_type TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'retried'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar integrations
CREATE TABLE public.calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calendar_type TEXT NOT NULL, -- 'google', 'outlook', 'apple'
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar events mapping
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_integration_id UUID NOT NULL REFERENCES public.calendar_integrations(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'delivery', 'pickup', 'repair'
  sync_status TEXT NOT NULL DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment tracking
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automated reports configuration
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  schedule_cron TEXT, -- cron expression for automated reports
  recipients JSONB NOT NULL, -- array of email addresses
  report_config JSONB NOT NULL, -- report parameters and filters
  active BOOLEAN NOT NULL DEFAULT true,
  last_generated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Analytics and metrics
CREATE TABLE public.delivery_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id),
  driver_id UUID REFERENCES public.drivers(id),
  company_id UUID REFERENCES public.companies(id),
  total_distance NUMERIC,
  total_time_minutes INTEGER,
  average_speed NUMERIC,
  fuel_cost NUMERIC,
  delivery_efficiency_score NUMERIC,
  customer_satisfaction_rating INTEGER,
  on_time_delivery BOOLEAN,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add company_id to existing tables for multi-tenancy
ALTER TABLE public.deliveries ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.drivers ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.mobile_homes ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.factories ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Enable RLS on all new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_offline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_email_parsing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_analytics ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_delivery_pieces_delivery_id ON public.delivery_pieces(delivery_id);
CREATE INDEX idx_delivery_pieces_vin_mso ON public.delivery_pieces(vin_number, mso_number);
CREATE INDEX idx_gps_tracking_offline_driver_delivery ON public.gps_tracking_offline(driver_id, delivery_id);
CREATE INDEX idx_gps_tracking_offline_recorded_at ON public.gps_tracking_offline(recorded_at);
CREATE INDEX idx_customer_tracking_sessions_token ON public.customer_tracking_sessions(session_token);
CREATE INDEX idx_factory_communications_delivery_id ON public.factory_communications(delivery_id);
CREATE INDEX idx_repair_requests_delivery_id ON public.repair_requests(delivery_id);
CREATE INDEX idx_notification_logs_delivery_id ON public.notification_logs(delivery_id);
CREATE INDEX idx_delivery_analytics_date ON public.delivery_analytics(date);
CREATE INDEX idx_delivery_analytics_company_id ON public.delivery_analytics(company_id);