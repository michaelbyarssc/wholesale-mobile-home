-- Create appointment scheduling system tables

-- Create appointment slots table for available time slots
CREATE TABLE public.appointment_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  max_bookings INTEGER NOT NULL DEFAULT 1,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  mobile_home_id UUID REFERENCES mobile_homes(id),
  location_type TEXT NOT NULL DEFAULT 'showroom' CHECK (location_type IN ('showroom', 'on_site', 'virtual')),
  location_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, start_time, mobile_home_id)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  mobile_home_id UUID REFERENCES mobile_homes(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  appointment_type TEXT NOT NULL DEFAULT 'viewing' CHECK (appointment_type IN ('viewing', 'consultation', 'inspection', 'delivery_planning')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  special_requests TEXT,
  confirmation_token TEXT UNIQUE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  agent_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment availability templates
CREATE TABLE public.appointment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_bookings INTEGER NOT NULL DEFAULT 1,
  location_type TEXT NOT NULL DEFAULT 'showroom',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment notifications table
CREATE TABLE public.appointment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('confirmation', 'reminder', 'cancellation', 'reschedule')),
  sent_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_appointment_slots_date ON appointment_slots(date);
CREATE INDEX idx_appointment_slots_mobile_home_id ON appointment_slots(mobile_home_id);
CREATE INDEX idx_appointment_slots_available ON appointment_slots(available);

CREATE INDEX idx_appointments_slot_id ON appointments(slot_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_mobile_home_id ON appointments(mobile_home_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX idx_appointments_agent_id ON appointments(agent_id);

CREATE INDEX idx_appointment_templates_day_of_week ON appointment_templates(day_of_week);
CREATE INDEX idx_appointment_templates_active ON appointment_templates(active);

CREATE INDEX idx_appointment_notifications_appointment_id ON appointment_notifications(appointment_id);
CREATE INDEX idx_appointment_notifications_scheduled_for ON appointment_notifications(scheduled_for);

-- Add updated_at triggers
CREATE TRIGGER update_appointment_slots_updated_at
  BEFORE UPDATE ON appointment_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_templates_updated_at
  BEFORE UPDATE ON appointment_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_slots
CREATE POLICY "Anyone can view available appointment slots"
  ON appointment_slots FOR SELECT
  USING (available = true);

CREATE POLICY "Admins can manage all appointment slots"
  ON appointment_slots FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Agents can manage assigned appointments"
  ON appointments FOR ALL
  USING (auth.uid() = agent_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all appointments"
  ON appointments FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for appointment_templates
CREATE POLICY "Anyone can view active appointment templates"
  ON appointment_templates FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage appointment templates"
  ON appointment_templates FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for appointment_notifications
CREATE POLICY "Users can view notifications for their appointments"
  ON appointment_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = appointment_id 
    AND (auth.uid() = appointments.user_id OR auth.uid() = appointments.agent_id)
  ));

CREATE POLICY "System can manage appointment notifications"
  ON appointment_notifications FOR ALL
  USING (true);

CREATE POLICY "Admins can manage all appointment notifications"
  ON appointment_notifications FOR ALL
  USING (is_admin(auth.uid()));

-- Create function to generate confirmation tokens
CREATE OR REPLACE FUNCTION generate_appointment_confirmation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'appt_' || encode(gen_random_bytes(16), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update slot booking count
CREATE OR REPLACE FUNCTION update_slot_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment booking count
    UPDATE appointment_slots 
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.slot_id;
    
    -- Mark slot as unavailable if at capacity
    UPDATE appointment_slots 
    SET available = false
    WHERE id = NEW.slot_id AND current_bookings >= max_bookings;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement booking count
    UPDATE appointment_slots 
    SET current_bookings = current_bookings - 1
    WHERE id = OLD.slot_id;
    
    -- Mark slot as available if under capacity
    UPDATE appointment_slots 
    SET available = true
    WHERE id = OLD.slot_id AND current_bookings < max_bookings;
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != NEW.status THEN
      -- If appointment was cancelled or became no-show, free up the slot
      IF NEW.status IN ('cancelled', 'no_show') AND OLD.status NOT IN ('cancelled', 'no_show') THEN
        UPDATE appointment_slots 
        SET current_bookings = current_bookings - 1,
            available = true
        WHERE id = NEW.slot_id;
      -- If appointment was reactivated, take up the slot
      ELSIF OLD.status IN ('cancelled', 'no_show') AND NEW.status NOT IN ('cancelled', 'no_show') THEN
        UPDATE appointment_slots 
        SET current_bookings = current_bookings + 1
        WHERE id = NEW.slot_id;
        
        UPDATE appointment_slots 
        SET available = false
        WHERE id = NEW.slot_id AND current_bookings >= max_bookings;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for slot booking management
CREATE TRIGGER manage_slot_bookings_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booking_count();

CREATE TRIGGER manage_slot_bookings_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booking_count();

CREATE TRIGGER manage_slot_bookings_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booking_count();

-- Create function to auto-assign agents to appointments
CREATE OR REPLACE FUNCTION auto_assign_appointment_agent()
RETURNS TRIGGER AS $$
DECLARE
  available_agent UUID;
BEGIN
  -- Find an available agent (admin user with fewest active appointments)
  SELECT ur.user_id INTO available_agent
  FROM user_roles ur
  LEFT JOIN (
    SELECT agent_id, COUNT(*) as appointment_count
    FROM appointments 
    WHERE agent_id IS NOT NULL 
    AND status IN ('scheduled', 'confirmed', 'in_progress')
    AND slot_id IN (
      SELECT id FROM appointment_slots 
      WHERE date >= CURRENT_DATE
    )
    GROUP BY agent_id
  ) ac ON ur.user_id = ac.agent_id
  WHERE ur.role IN ('admin', 'super_admin')
  ORDER BY COALESCE(ac.appointment_count, 0) ASC, RANDOM()
  LIMIT 1;

  -- Assign the agent if one is available
  IF available_agent IS NOT NULL THEN
    NEW.agent_id = available_agent;
  END IF;

  -- Generate confirmation token
  NEW.confirmation_token = generate_appointment_confirmation_token();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-assignment
CREATE TRIGGER auto_assign_appointment_agent_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_appointment_agent();

-- Insert default appointment templates for typical business hours
INSERT INTO appointment_templates (name, day_of_week, start_time, end_time, duration_minutes, max_bookings, location_type) VALUES
('Monday Morning Slots', 1, '09:00', '12:00', 60, 2, 'showroom'),
('Monday Afternoon Slots', 1, '13:00', '17:00', 60, 2, 'showroom'),
('Tuesday Morning Slots', 2, '09:00', '12:00', 60, 2, 'showroom'),
('Tuesday Afternoon Slots', 2, '13:00', '17:00', 60, 2, 'showroom'),
('Wednesday Morning Slots', 3, '09:00', '12:00', 60, 2, 'showroom'),
('Wednesday Afternoon Slots', 3, '13:00', '17:00', 60, 2, 'showroom'),
('Thursday Morning Slots', 4, '09:00', '12:00', 60, 2, 'showroom'),
('Thursday Afternoon Slots', 4, '13:00', '17:00', 60, 2, 'showroom'),
('Friday Morning Slots', 5, '09:00', '12:00', 60, 2, 'showroom'),
('Friday Afternoon Slots', 5, '13:00', '17:00', 60, 2, 'showroom'),
('Saturday Morning Slots', 6, '10:00', '14:00', 90, 3, 'showroom');

-- Enable realtime for appointment tables
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_notifications;