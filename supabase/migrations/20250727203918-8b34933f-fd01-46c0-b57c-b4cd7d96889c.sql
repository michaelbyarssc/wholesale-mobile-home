-- Add SMS notification settings to admin_settings table (using correct column names)
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES 
  ('sms_notifications_enabled', 'false', 'Enable/disable SMS notifications for estimates'),
  ('sms_template', 'New estimate from ${customer_name} for ${mobile_home_model} ($${total_amount}). Review at www.WholesaleMobileHome.com. Contact: ${customer_phone}. Good luck!', 'SMS message template for estimate notifications'),
  ('fallback_admin_phone', '', 'Fallback admin phone number for SMS notifications')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Add SMS notification preferences to user notification preferences
-- First, let's ensure the notification_preferences table exists
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'immediate',
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_preferences
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences" 
ON notification_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all notification preferences" ON notification_preferences;
CREATE POLICY "Admins can view all notification preferences" 
ON notification_preferences 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Add SMS columns if they don't exist
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add SMS logging to notification_logs table (enhance existing structure)
ALTER TABLE notification_logs 
ADD COLUMN IF NOT EXISTS sms_status TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_at TIMESTAMP WITH TIME ZONE;

-- Create function to format phone numbers
CREATE OR REPLACE FUNCTION format_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digits
  phone_input := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- If it starts with 1 and is 11 digits, remove the 1
  IF length(phone_input) = 11 AND substring(phone_input, 1, 1) = '1' THEN
    phone_input := substring(phone_input, 2);
  END IF;
  
  -- If it's 10 digits, format as XXX-XXX-XXXX
  IF length(phone_input) = 10 THEN
    RETURN substring(phone_input, 1, 3) || '-' || substring(phone_input, 4, 3) || '-' || substring(phone_input, 7, 4);
  END IF;
  
  -- Return original if not 10 digits
  RETURN phone_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;