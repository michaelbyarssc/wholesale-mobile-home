-- Create delivery_schedules table for the two-phase system
CREATE TABLE IF NOT EXISTS public.delivery_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  
  -- Phase 1: Factory Pickup Scheduling
  pickup_scheduled_date TIMESTAMP WITH TIME ZONE,
  pickup_scheduled_time_start TIME,
  pickup_scheduled_time_end TIME,
  pickup_driver_id UUID REFERENCES public.drivers(id),
  pickup_timezone TEXT,
  pickup_confirmed_at TIMESTAMP WITH TIME ZONE,
  pickup_started_at TIMESTAMP WITH TIME ZONE,
  pickup_completed_at TIMESTAMP WITH TIME ZONE,
  pickup_photos TEXT[], -- Array of photo URLs
  pickup_signature_url TEXT,
  pickup_notes TEXT,
  
  -- Phase 2: Customer Delivery Scheduling  
  delivery_scheduled_date TIMESTAMP WITH TIME ZONE,
  delivery_scheduled_time_start TIME,
  delivery_scheduled_time_end TIME,
  delivery_driver_id UUID REFERENCES public.drivers(id),
  delivery_timezone TEXT,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  delivery_started_at TIMESTAMP WITH TIME ZONE,
  delivery_completed_at TIMESTAMP WITH TIME ZONE,
  delivery_photos TEXT[], -- Array of photo URLs
  delivery_signature_url TEXT,
  delivery_notes TEXT,
  
  -- Repair documentation
  repair_photos TEXT[], -- Array of repair photo URLs
  repair_notes TEXT,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);