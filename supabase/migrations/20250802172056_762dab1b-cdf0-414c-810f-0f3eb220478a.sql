-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION validate_gps_accuracy()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark as meeting accuracy requirement if within 50 meters
    NEW.meets_accuracy_requirement := COALESCE(NEW.accuracy_meters <= 50, true);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_driver_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only send notification for new assignments
    IF TG_OP = 'INSERT' AND NEW.assignment_status = 'pending' THEN
        -- This will be handled by the edge function
        PERFORM pg_notify('driver_assignment', json_build_object(
            'assignment_id', NEW.id,
            'driver_id', NEW.driver_id,
            'delivery_id', NEW.delivery_id
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_assignment_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log status changes
    IF OLD.assignment_status IS DISTINCT FROM NEW.assignment_status THEN
        -- Update timestamps
        IF NEW.assignment_status = 'accepted' THEN
            NEW.accepted_at = now();
        ELSIF NEW.assignment_status = 'declined' THEN
            NEW.declined_at = now();
            -- Notify admin of declined assignment
            PERFORM pg_notify('assignment_declined', json_build_object(
                'assignment_id', NEW.id,
                'driver_id', NEW.driver_id,
                'delivery_id', NEW.delivery_id
            )::text);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;