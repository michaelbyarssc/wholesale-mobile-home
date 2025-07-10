-- Fix search_path security warnings for database functions

-- Update update_review_helpful_count function
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews 
    SET helpful_votes = helpful_votes + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews 
    SET helpful_votes = helpful_votes - 1 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Update generate_chat_session_token function
CREATE OR REPLACE FUNCTION public.generate_chat_session_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN 'chat_' || encode(gen_random_bytes(16), 'base64url');
END;
$function$;

-- Update auto_assign_chat_session function
CREATE OR REPLACE FUNCTION public.auto_assign_chat_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  available_agent UUID;
BEGIN
  -- Find an available agent (admin user who is not currently handling too many active sessions)
  SELECT ur.user_id INTO available_agent
  FROM user_roles ur
  WHERE ur.role IN ('admin', 'super_admin')
  AND ur.user_id NOT IN (
    SELECT agent_id 
    FROM chat_sessions 
    WHERE agent_id IS NOT NULL 
    AND status = 'active'
    GROUP BY agent_id 
    HAVING COUNT(*) >= 5  -- Max 5 concurrent sessions per agent
  )
  ORDER BY RANDOM()
  LIMIT 1;

  -- If an agent is available, assign them
  IF available_agent IS NOT NULL THEN
    NEW.agent_id = available_agent;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update generate_appointment_confirmation_token function
CREATE OR REPLACE FUNCTION public.generate_appointment_confirmation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN 'appt_' || encode(gen_random_bytes(16), 'base64url');
END;
$function$;

-- Update update_slot_booking_count function
CREATE OR REPLACE FUNCTION public.update_slot_booking_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Update auto_assign_appointment_agent function
CREATE OR REPLACE FUNCTION public.auto_assign_appointment_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;