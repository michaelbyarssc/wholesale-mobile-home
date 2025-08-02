-- Add assignment status and tracking fields to delivery_assignments
ALTER TABLE delivery_assignments 
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'accepted', 'declined')),
ADD COLUMN IF NOT EXISTS starting_mileage NUMERIC,
ADD COLUMN IF NOT EXISTS ending_mileage NUMERIC,
ADD COLUMN IF NOT EXISTS expenses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS phase_times JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- Create photo category enum and add to delivery_photos
DO $$ BEGIN
    CREATE TYPE photo_category AS ENUM (
        'pickup_front', 'pickup_back', 'pickup_left', 'pickup_right', 
        'delivery_front', 'delivery_back', 'delivery_left', 'delivery_right', 
        'issue', 'signature', 'damage', 'special_condition'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE delivery_photos 
ADD COLUMN IF NOT EXISTS photo_category photo_category,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Create delivery_issues table
CREATE TABLE IF NOT EXISTS delivery_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES delivery_assignments(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('mechanical', 'route', 'weather', 'customer', 'permit', 'damage', 'other')),
    description TEXT NOT NULL,
    photos JSONB DEFAULT '[]',
    location_lat NUMERIC,
    location_lng NUMERIC,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_by UUID,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Enable RLS on delivery_issues
ALTER TABLE delivery_issues ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery_issues
CREATE POLICY "Drivers can manage issues for their assignments" 
ON delivery_issues 
FOR ALL 
USING (
    driver_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM drivers d 
        WHERE d.id = delivery_issues.driver_id 
        AND d.created_by = auth.uid()
    )
);

CREATE POLICY "Admins can view all delivery issues" 
ON delivery_issues 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "System can manage delivery issues" 
ON delivery_issues 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add GPS accuracy tracking
ALTER TABLE delivery_gps_tracking 
ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC,
ADD COLUMN IF NOT EXISTS meets_accuracy_requirement BOOLEAN DEFAULT true;

-- Create function to validate GPS accuracy
CREATE OR REPLACE FUNCTION validate_gps_accuracy()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as meeting accuracy requirement if within 50 meters
    NEW.meets_accuracy_requirement := COALESCE(NEW.accuracy_meters <= 50, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for GPS accuracy validation
DROP TRIGGER IF EXISTS validate_gps_accuracy_trigger ON delivery_gps_tracking;
CREATE TRIGGER validate_gps_accuracy_trigger
    BEFORE INSERT OR UPDATE ON delivery_gps_tracking
    FOR EACH ROW
    EXECUTE FUNCTION validate_gps_accuracy();

-- Create function to send driver assignment notifications
CREATE OR REPLACE FUNCTION notify_driver_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for driver assignment notifications
DROP TRIGGER IF EXISTS notify_driver_assignment_trigger ON delivery_assignments;
CREATE TRIGGER notify_driver_assignment_trigger
    AFTER INSERT ON delivery_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_driver_assignment();

-- Create function to handle assignment status changes
CREATE OR REPLACE FUNCTION handle_assignment_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for assignment status changes
DROP TRIGGER IF EXISTS handle_assignment_status_change_trigger ON delivery_assignments;
CREATE TRIGGER handle_assignment_status_change_trigger
    BEFORE UPDATE ON delivery_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_assignment_status_change();

-- Update delivery status history to track more details
ALTER TABLE delivery_status_history 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id),
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC;