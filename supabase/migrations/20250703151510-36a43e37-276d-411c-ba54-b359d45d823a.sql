-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create factories table
CREATE TABLE public.factories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for mobile_home to factory relationships with lead times
CREATE TABLE public.mobile_home_factories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile_home_id UUID NOT NULL REFERENCES public.mobile_homes(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_lead_time_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mobile_home_id, factory_id)
);

-- Enable RLS on both tables
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_home_factories ENABLE ROW LEVEL SECURITY;

-- RLS policies for factories table
CREATE POLICY "Admins can manage factories" 
ON public.factories 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view factories" 
ON public.factories 
FOR SELECT 
USING (true);

-- RLS policies for mobile_home_factories junction table
CREATE POLICY "Admins can manage mobile home factory assignments" 
ON public.mobile_home_factories 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view mobile home factory assignments" 
ON public.mobile_home_factories 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates on factories
CREATE TRIGGER update_factories_updated_at
BEFORE UPDATE ON public.factories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on mobile_home_factories
CREATE TRIGGER update_mobile_home_factories_updated_at
BEFORE UPDATE ON public.mobile_home_factories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_mobile_home_factories_mobile_home_id ON public.mobile_home_factories(mobile_home_id);
CREATE INDEX idx_mobile_home_factories_factory_id ON public.mobile_home_factories(factory_id);
CREATE INDEX idx_factories_state ON public.factories(state);
CREATE INDEX idx_factories_name ON public.factories(name);