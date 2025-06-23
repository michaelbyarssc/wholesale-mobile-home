
-- Create enum for mobile home series
CREATE TYPE mobile_home_series AS ENUM ('Tru', 'Epic');

-- Create mobile homes table
CREATE TABLE public.mobile_homes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL DEFAULT 'Clayton',
  series mobile_home_series NOT NULL,
  model TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create estimates table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  delivery_address TEXT,
  preferred_contact TEXT,
  timeline TEXT,
  additional_requirements TEXT,
  mobile_home_id UUID REFERENCES public.mobile_homes(id),
  selected_services UUID[] DEFAULT '{}',
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin settings table for configurable content
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.mobile_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
      AND role = 'admin'
  );
$$;

-- RLS Policies for mobile_homes (public read, admin write)
CREATE POLICY "Anyone can view active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  USING (active = true);

CREATE POLICY "Admins can manage mobile homes" 
  ON public.mobile_homes 
  FOR ALL 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for services (public read, admin write)
CREATE POLICY "Anyone can view active services" 
  ON public.services 
  FOR SELECT 
  USING (active = true);

CREATE POLICY "Admins can manage services" 
  ON public.services 
  FOR ALL 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for estimates (admins can see all)
CREATE POLICY "Admins can view all estimates" 
  ON public.estimates 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can create estimates" 
  ON public.estimates 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can update estimates" 
  ON public.estimates 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for admin_settings (admin only)
CREATE POLICY "Admins can manage settings" 
  ON public.admin_settings 
  FOR ALL 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for user_roles (admin only)
CREATE POLICY "Admins can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Insert sample data for mobile homes
INSERT INTO public.mobile_homes (manufacturer, series, model, price) VALUES
('Clayton', 'Tru', 'Tru MH 16x80', 75000.00),
('Clayton', 'Tru', 'Tru MH 18x80', 85000.00),
('Clayton', 'Tru', 'Tru MH 20x80', 95000.00),
('Clayton', 'Epic', 'Epic MH 16x80', 95000.00),
('Clayton', 'Epic', 'Epic MH 18x80', 105000.00),
('Clayton', 'Epic', 'Epic MH 20x80', 115000.00);

-- Insert sample data for services
INSERT INTO public.services (name, description, price) VALUES
('Delivery and Setup', 'Complete delivery and professional setup of your mobile home', 5000.00),
('Site Preparation', 'Site leveling, grading, and preparation for installation', 3500.00),
('Electrical Hookup', 'Professional electrical connection and hookup services', 1500.00),
('Plumbing Connections', 'Water, sewer, and gas line connections', 2000.00),
('Brick Skirting Installation', 'Premium brick skirting around the home perimeter', 4500.00),
('Vinyl Skirting Installation', 'Standard vinyl skirting installation', 2500.00),
('Steps/Decks', 'Custom steps and deck installation', 3000.00);

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('business_name', 'Wholesale Homes of the Carolinas', 'Company name displayed on estimates'),
('business_phone', '(555) 123-4567', 'Business phone number'),
('business_email', 'info@wholesalehomescarolinas.com', 'Business email address'),
('estimate_email_template', 'Thank you for your interest in our mobile homes! Please find your estimate attached. We will contact you shortly to discuss next steps.', 'Email template for estimates'),
('estimate_sms_template', 'Your mobile home estimate from Wholesale Homes of the Carolinas is ready! Total: ${total}. We will email you the details shortly.', 'SMS template for estimates');
