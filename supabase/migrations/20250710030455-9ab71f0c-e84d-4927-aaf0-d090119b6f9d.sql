-- Create tables for Google Calendar integration

-- Store user calendar connections and OAuth tokens
CREATE TABLE public.user_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  calendar_timezone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_default_for_appointments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Store user calendar preferences and settings
CREATE TABLE public.user_calendar_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  event_privacy TEXT NOT NULL DEFAULT 'private' CHECK (event_privacy IN ('private', 'public', 'default')),
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_create_events BOOLEAN NOT NULL DEFAULT true,
  check_availability BOOLEAN NOT NULL DEFAULT true,
  include_customer_details BOOLEAN NOT NULL DEFAULT true,
  include_mobile_home_details BOOLEAN NOT NULL DEFAULT true,
  event_title_template TEXT DEFAULT 'Appointment: {customer_name} - {mobile_home_model}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Map appointments to calendar events for two-way sync
CREATE TABLE public.calendar_event_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  calendar_connection_id UUID NOT NULL REFERENCES user_calendar_connections(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed', 'deleted')),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, calendar_connection_id),
  UNIQUE(calendar_connection_id, google_event_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_calendar_connections
CREATE POLICY "Users can manage their own calendar connections"
ON public.user_calendar_connections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all calendar connections"
ON public.user_calendar_connections
FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies for user_calendar_preferences  
CREATE POLICY "Users can manage their own calendar preferences"
ON public.user_calendar_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all calendar preferences"
ON public.user_calendar_preferences
FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies for calendar_event_mappings
CREATE POLICY "Users can view mappings for their calendar connections"
ON public.calendar_event_mappings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_calendar_connections 
    WHERE id = calendar_event_mappings.calendar_connection_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can manage event mappings"
ON public.calendar_event_mappings
FOR ALL
USING (true);

CREATE POLICY "Admins can view all event mappings"
ON public.calendar_event_mappings
FOR SELECT
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_user_calendar_connections_user_id ON user_calendar_connections(user_id);
CREATE INDEX idx_user_calendar_connections_calendar_id ON user_calendar_connections(calendar_id);
CREATE INDEX idx_user_calendar_preferences_user_id ON user_calendar_preferences(user_id);
CREATE INDEX idx_calendar_event_mappings_appointment_id ON calendar_event_mappings(appointment_id);
CREATE INDEX idx_calendar_event_mappings_connection_id ON calendar_event_mappings(calendar_connection_id);
CREATE INDEX idx_calendar_event_mappings_google_event_id ON calendar_event_mappings(google_event_id);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_user_calendar_connections_updated_at
  BEFORE UPDATE ON user_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_calendar_preferences_updated_at
  BEFORE UPDATE ON user_calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set default calendar preferences for new admin users
CREATE OR REPLACE FUNCTION public.create_default_calendar_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create preferences for admin/super_admin users
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.user_id 
    AND role IN ('admin', 'super_admin')
  ) THEN
    INSERT INTO public.user_calendar_preferences (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to create default preferences when admin users are created
CREATE TRIGGER create_calendar_preferences_for_admins
  AFTER INSERT ON user_roles
  FOR EACH ROW
  WHEN (NEW.role IN ('admin', 'super_admin'))
  EXECUTE FUNCTION create_default_calendar_preferences();