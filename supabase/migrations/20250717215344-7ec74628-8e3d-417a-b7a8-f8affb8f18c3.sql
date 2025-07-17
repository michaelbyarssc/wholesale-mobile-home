-- Create delivery notifications table
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id),
  notification_type TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create calendar integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_type TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_integration_id UUID REFERENCES public.calendar_integrations(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Admins can manage all notifications"
ON public.delivery_notifications
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage their calendar integrations"
ON public.calendar_integrations
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all calendar events"
ON public.calendar_events
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- Create storage buckets if they don't exist (skip existing bucket policies)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('delivery-photos', 'delivery-photos', true),
  ('delivery-documents', 'delivery-documents', true)
ON CONFLICT (id) DO NOTHING;