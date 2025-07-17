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

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('delivery-photos', 'delivery-photos', true),
  ('delivery-documents', 'delivery-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for storage buckets
CREATE POLICY "Public access to delivery photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'delivery-photos');

CREATE POLICY "Staff can upload delivery photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

CREATE POLICY "Public access to delivery documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'delivery-documents');

CREATE POLICY "Staff can upload delivery documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-documents');