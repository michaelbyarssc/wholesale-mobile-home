-- Enhancement #19: Real-time Notifications & Activity Feed

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  category TEXT NOT NULL DEFAULT 'general', -- estimate, inventory, price, system
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  actor_id UUID,
  action TEXT NOT NULL, -- created, updated, deleted, approved, etc.
  entity_type TEXT NOT NULL, -- estimate, mobile_home, user, etc.
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  estimate_updates BOOLEAN NOT NULL DEFAULT true,
  inventory_updates BOOLEAN NOT NULL DEFAULT true,
  price_updates BOOLEAN NOT NULL DEFAULT false,
  system_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_frequency TEXT NOT NULL DEFAULT 'immediate', -- immediate, daily, weekly
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for activity_feed
CREATE POLICY "Users can view relevant activity"
ON public.activity_feed
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = actor_id OR
  is_admin(auth.uid())
);

CREATE POLICY "System can create activity records"
ON public.activity_feed
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all activity"
ON public.activity_feed
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.notification_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences"
ON public.notification_preferences
FOR SELECT
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_notifications_expires_at ON public.notifications(expires_at);

CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_activity_feed_actor_id ON public.activity_feed(actor_id);
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_entity ON public.activity_feed(entity_type, entity_id);

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'general',
  p_data JSONB DEFAULT '{}',
  p_expires_hours INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time if provided
  IF p_expires_hours IS NOT NULL THEN
    expires_at_val := now() + (p_expires_hours || ' hours')::INTERVAL;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id, title, message, type, category, data, expires_at
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_data, expires_at_val
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Function to create activity record
CREATE OR REPLACE FUNCTION public.create_activity(
  p_user_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    user_id, actor_id, action, entity_type, entity_id, description, metadata
  ) VALUES (
    p_user_id, p_actor_id, p_action, p_entity_type, p_entity_id, p_description, p_metadata
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable realtime for notifications and activity
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;