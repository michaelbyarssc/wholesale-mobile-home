-- Update mobile_home_factories to support only one factory per home
-- First, add a unique constraint to ensure only one factory per mobile home
DROP INDEX IF EXISTS idx_mobile_home_factories_mobile_home_id;
CREATE UNIQUE INDEX idx_mobile_home_factories_mobile_home_unique ON mobile_home_factories(mobile_home_id);

-- Create table to store calculated shipping distances and costs
CREATE TABLE public.shipping_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id),
  delivery_state TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_zip TEXT NOT NULL,
  distance_miles NUMERIC NOT NULL,
  estimated_travel_time_minutes INTEGER,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  google_maps_response JSONB,
  UNIQUE(factory_id, delivery_state, delivery_city, delivery_zip)
);

-- Enable RLS on shipping_calculations
ALTER TABLE public.shipping_calculations ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipping_calculations
CREATE POLICY "Anyone can view shipping calculations" 
ON public.shipping_calculations 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage shipping calculations" 
ON public.shipping_calculations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add indexes for better performance
CREATE INDEX idx_shipping_calculations_factory_location ON public.shipping_calculations(factory_id, delivery_state, delivery_city);
CREATE INDEX idx_shipping_calculations_calculated_at ON public.shipping_calculations(calculated_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_shipping_calculations_updated_at
BEFORE UPDATE ON public.shipping_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();