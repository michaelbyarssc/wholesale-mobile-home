-- Create recent purchases table for social proof (anonymized data)
CREATE TABLE public.recent_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_first_name TEXT NOT NULL,
  customer_location TEXT NOT NULL, -- City, State format
  mobile_home_model TEXT NOT NULL,
  mobile_home_manufacturer TEXT NOT NULL,
  purchase_amount NUMERIC,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social proof settings table
CREATE TABLE public.social_proof_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_recent_purchases BOOLEAN NOT NULL DEFAULT true,
  show_testimonials BOOLEAN NOT NULL DEFAULT true,
  show_customer_count BOOLEAN NOT NULL DEFAULT true,
  show_homes_sold BOOLEAN NOT NULL DEFAULT true,
  recent_purchases_limit INTEGER NOT NULL DEFAULT 10,
  testimonials_rotation_seconds INTEGER NOT NULL DEFAULT 5,
  customer_count INTEGER NOT NULL DEFAULT 5000,
  homes_sold_count INTEGER NOT NULL DEFAULT 1200,
  years_in_business INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recent_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for recent_purchases
CREATE POLICY "Anyone can view active recent purchases" 
ON public.recent_purchases 
FOR SELECT 
USING (active = true AND display_until > now());

CREATE POLICY "Admins can manage recent purchases" 
ON public.recent_purchases 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS policies for social_proof_settings
CREATE POLICY "Anyone can view social proof settings" 
ON public.social_proof_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage social proof settings" 
ON public.social_proof_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_recent_purchases_active_date ON public.recent_purchases(active, purchase_date DESC) WHERE active = true;
CREATE INDEX idx_recent_purchases_display_until ON public.recent_purchases(display_until) WHERE active = true;

-- Add update triggers
CREATE TRIGGER update_recent_purchases_updated_at
  BEFORE UPDATE ON public.recent_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_proof_settings_updated_at
  BEFORE UPDATE ON public.social_proof_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default social proof settings
INSERT INTO public.social_proof_settings (
  show_recent_purchases,
  show_testimonials,
  show_customer_count,
  show_homes_sold,
  recent_purchases_limit,
  testimonials_rotation_seconds,
  customer_count,
  homes_sold_count,
  years_in_business
) VALUES (
  true,
  true,
  true,
  true,
  10,
  8,
  5247,
  1456,
  18
);

-- Insert sample recent purchases for demonstration
INSERT INTO public.recent_purchases (
  customer_first_name,
  customer_location,
  mobile_home_model,
  mobile_home_manufacturer,
  purchase_amount,
  purchase_date,
  display_until
) VALUES 
('Sarah', 'Charleston, SC', 'The Oakwood', 'Clayton', 89500, now() - INTERVAL '2 hours', now() + INTERVAL '28 days'),
('Michael', 'Greenville, SC', 'Heritage 1680-32B', 'Champion', 76200, now() - INTERVAL '5 hours', now() + INTERVAL '28 days'),
('Jennifer', 'Columbia, SC', 'The Hampton', 'Clayton', 94800, now() - INTERVAL '1 day', now() + INTERVAL '27 days'),
('David', 'Spartanburg, SC', 'Freedom 2856', 'Champion', 105300, now() - INTERVAL '2 days', now() + INTERVAL '26 days'),
('Lisa', 'Rock Hill, SC', 'The Charleston', 'Clayton', 82700, now() - INTERVAL '3 days', now() + INTERVAL '25 days'),
('Robert', 'Anderson, SC', 'Patriot PAR16763H', 'Champion', 71500, now() - INTERVAL '4 days', now() + INTERVAL '24 days'),
('Amanda', 'Sumter, SC', 'The Savannah', 'Clayton', 88900, now() - INTERVAL '5 days', now() + INTERVAL '23 days'),
('James', 'Florence, SC', 'Heritage 1676-32C', 'Champion', 79300, now() - INTERVAL '6 days', now() + INTERVAL '22 days'),
('Michelle', 'Myrtle Beach, SC', 'The Wilmington', 'Clayton', 97200, now() - INTERVAL '1 week', now() + INTERVAL '21 days'),
('Christopher', 'Aiken, SC', 'Freedom 2460', 'Champion', 68900, now() - INTERVAL '1 week', now() + INTERVAL '20 days');