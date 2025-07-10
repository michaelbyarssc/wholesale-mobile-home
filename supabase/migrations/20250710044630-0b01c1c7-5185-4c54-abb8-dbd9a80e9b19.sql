-- Create automation message templates table
CREATE TABLE public.automation_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('email', 'sms')),
  subject TEXT, -- For emails only
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available variables like {{customer_name}}, {{appointment_time}}, etc.
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation templates table
CREATE TABLE public.automation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_based', 'event_based')),
  trigger_event TEXT NOT NULL, -- e.g., 'lead_created', 'estimate_approved', 'appointment_scheduled'
  trigger_delay_days INTEGER, -- For time-based triggers
  trigger_delay_hours INTEGER DEFAULT 0,
  trigger_conditions JSONB DEFAULT '{}'::jsonb, -- Additional conditions
  message_template_id UUID REFERENCES public.automation_message_templates(id),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('leads', 'customers', 'both')),
  active BOOLEAN NOT NULL DEFAULT true,
  max_executions_per_lead INTEGER DEFAULT NULL, -- Limit per lead
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation executions table
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_template_id UUID NOT NULL REFERENCES public.automation_templates(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  customer_email TEXT,
  customer_phone TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'executing', 'completed', 'failed', 'cancelled', 'paused')),
  message_content TEXT, -- Rendered message with variables replaced
  message_subject TEXT, -- For emails
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation settings table
CREATE TABLE public.automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation opt_outs table
CREATE TABLE public.automation_opt_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  opt_out_type TEXT NOT NULL CHECK (opt_out_type IN ('email', 'sms', 'all')),
  lead_id UUID REFERENCES public.leads(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_email_opt_out UNIQUE (email, opt_out_type),
  CONSTRAINT unique_phone_opt_out UNIQUE (phone, opt_out_type),
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Enable Row Level Security
ALTER TABLE public.automation_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_opt_outs ENABLE ROW LEVEL SECURITY;

-- Create policies for automation_message_templates
CREATE POLICY "Admins can manage message templates" 
  ON public.automation_message_templates 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create policies for automation_templates
CREATE POLICY "Admins can manage automation templates" 
  ON public.automation_templates 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create policies for automation_executions
CREATE POLICY "Admins can view all automation executions" 
  ON public.automation_executions 
  FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "System can manage automation executions" 
  ON public.automation_executions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create policies for automation_settings
CREATE POLICY "Admins can manage automation settings" 
  ON public.automation_settings 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create policies for automation_opt_outs
CREATE POLICY "Admins can view all opt-outs" 
  ON public.automation_opt_outs 
  FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can create opt-outs" 
  ON public.automation_opt_outs 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own opt-outs" 
  ON public.automation_opt_outs 
  FOR SELECT 
  USING (lead_id IN (
    SELECT id FROM leads WHERE user_id = auth.uid() OR assigned_to = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_automation_message_templates_updated_at
  BEFORE UPDATE ON public.automation_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_templates_updated_at
  BEFORE UPDATE ON public.automation_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_executions_updated_at
  BEFORE UPDATE ON public.automation_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_automation_executions_scheduled_for ON public.automation_executions (scheduled_for, status);
CREATE INDEX idx_automation_executions_lead_id ON public.automation_executions (lead_id);
CREATE INDEX idx_automation_executions_template_id ON public.automation_executions (automation_template_id);
CREATE INDEX idx_automation_templates_trigger_event ON public.automation_templates (trigger_event, active);
CREATE INDEX idx_automation_opt_outs_email ON public.automation_opt_outs (email);
CREATE INDEX idx_automation_opt_outs_phone ON public.automation_opt_outs (phone);

-- Insert default automation settings
INSERT INTO public.automation_settings (setting_key, setting_value, description) VALUES
  ('max_daily_messages_per_lead', '{"value": 3}', 'Maximum number of automated messages per lead per day'),
  ('max_weekly_messages_per_lead', '{"value": 10}', 'Maximum number of automated messages per lead per week'),
  ('global_automation_enabled', '{"value": true}', 'Global toggle for all automations'),
  ('business_hours_only', '{"value": false}', 'Send messages only during business hours'),
  ('business_hours', '{"start": "09:00", "end": "17:00", "timezone": "America/New_York"}', 'Business hours configuration'),
  ('opt_out_message', '{"email": "Reply STOP to opt out", "sms": "Reply STOP to opt out"}', 'Default opt-out instructions');

-- Insert default message templates
INSERT INTO public.automation_message_templates (name, template_type, subject, content, variables) VALUES
  ('Welcome Email', 'email', 'Welcome to {{business_name}}!', 
   'Hi {{customer_name}},\n\nThank you for your interest in our mobile homes! We''re excited to help you find your perfect home.\n\nBest regards,\nThe {{business_name}} Team', 
   '["customer_name", "business_name"]'),
  
  ('Follow-up SMS', 'sms', NULL, 
   'Hi {{customer_name}}, this is {{agent_name}} from {{business_name}}. Just following up on your interest in mobile homes. Any questions? Reply STOP to opt out.', 
   '["customer_name", "agent_name", "business_name"]'),
   
  ('Appointment Reminder Email', 'email', 'Appointment Reminder - {{appointment_date}}', 
   'Hi {{customer_name}},\n\nThis is a reminder about your appointment on {{appointment_date}} at {{appointment_time}}.\n\nLocation: {{appointment_location}}\n\nSee you soon!\n\n{{business_name}}', 
   '["customer_name", "appointment_date", "appointment_time", "appointment_location", "business_name"]'),
   
  ('Estimate Expiration Warning', 'email', 'Your Estimate Expires Soon', 
   'Hi {{customer_name}},\n\nYour estimate for the {{mobile_home_model}} expires on {{expiration_date}}. Don''t miss out on this great deal!\n\nContact us to secure your home today.\n\n{{business_name}}', 
   '["customer_name", "mobile_home_model", "expiration_date", "business_name"]');

-- Insert default automation templates
INSERT INTO public.automation_templates (name, description, trigger_type, trigger_event, trigger_delay_days, message_template_id, target_audience) VALUES
  ('New Lead Welcome', 'Send welcome message to new leads', 'time_based', 'lead_created', 0, 
   (SELECT id FROM automation_message_templates WHERE name = 'Welcome Email'), 'leads'),
   
  ('3-Day Follow-up', 'Follow up with leads after 3 days', 'time_based', 'lead_created', 3, 
   (SELECT id FROM automation_message_templates WHERE name = 'Follow-up SMS'), 'leads'),
   
  ('Appointment Reminder', 'Remind customers about upcoming appointments', 'time_based', 'appointment_scheduled', 0, 
   (SELECT id FROM automation_message_templates WHERE name = 'Appointment Reminder Email'), 'both');

-- Create function to process automation variables
CREATE OR REPLACE FUNCTION public.process_automation_variables(
  content TEXT,
  lead_data JSONB DEFAULT '{}'::jsonb,
  appointment_data JSONB DEFAULT '{}'::jsonb,
  mobile_home_data JSONB DEFAULT '{}'::jsonb
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  processed_content TEXT;
  business_settings JSONB;
BEGIN
  processed_content := content;
  
  -- Get business settings
  SELECT setting_value INTO business_settings 
  FROM admin_settings 
  WHERE setting_key = 'business_name';
  
  -- Replace lead variables
  IF lead_data ? 'first_name' THEN
    processed_content := REPLACE(processed_content, '{{customer_name}}', lead_data->>'first_name');
  END IF;
  
  IF lead_data ? 'email' THEN
    processed_content := REPLACE(processed_content, '{{customer_email}}', lead_data->>'email');
  END IF;
  
  -- Replace appointment variables
  IF appointment_data ? 'appointment_date' THEN
    processed_content := REPLACE(processed_content, '{{appointment_date}}', appointment_data->>'appointment_date');
  END IF;
  
  IF appointment_data ? 'appointment_time' THEN
    processed_content := REPLACE(processed_content, '{{appointment_time}}', appointment_data->>'appointment_time');
  END IF;
  
  -- Replace mobile home variables
  IF mobile_home_data ? 'model' THEN
    processed_content := REPLACE(processed_content, '{{mobile_home_model}}', mobile_home_data->>'model');
  END IF;
  
  -- Replace business variables
  IF business_settings ? 'value' THEN
    processed_content := REPLACE(processed_content, '{{business_name}}', business_settings->>'value');
  END IF;
  
  RETURN processed_content;
END;
$$;