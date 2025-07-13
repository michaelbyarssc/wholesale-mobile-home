-- Create a simple settings table for storing the Mapbox token
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Insert the Mapbox token placeholder
INSERT INTO public.app_settings (key, value, description)
VALUES ('mapbox_public_token', 'pk.eyJ1IjoibWljaGFlbGJ5YXJzIiwiYSI6ImNtZDBhOWRlbDBvZzAycnB4OXFseHR4OWgifQ.gAGSFLtmTi7BH_XPhi82Bw', 'Mapbox public API token for maps')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();