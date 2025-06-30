
-- Create a table for home options
CREATE TABLE public.home_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  markup_percentage NUMERIC NOT NULL DEFAULT 0,
  calculated_price NUMERIC GENERATED ALWAYS AS (cost_price * (1 + markup_percentage / 100)) STORED,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) - only admins can manage home options
ALTER TABLE public.home_options ENABLE ROW LEVEL SECURITY;

-- Create policy that allows admins to manage home options
CREATE POLICY "Admins can manage home options" 
  ON public.home_options 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- Create policy that allows authenticated users to view active home options
CREATE POLICY "Users can view active home options" 
  ON public.home_options 
  FOR SELECT 
  TO authenticated
  USING (active = true);

-- Create index for better performance
CREATE INDEX idx_home_options_active_display_order ON public.home_options (active, display_order);
