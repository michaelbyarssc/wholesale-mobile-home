-- Create remaining tables with proper column names

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_gps_delivery_timestamp 
  ON public.delivery_gps_tracking(delivery_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_delivery_gps_driver_timestamp 
  ON public.delivery_gps_tracking(driver_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_token 
  ON public.driver_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_phone 
  ON public.driver_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_active 
  ON public.driver_sessions(driver_id, active);

-- Create functions
CREATE OR REPLACE FUNCTION generate_driver_session_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'drv_' || replace(gen_random_uuid()::text, '-', '');
END;
$$ LANGUAGE plpgsql;