-- Comprehensive migration to timezone-aware date storage
-- This converts ALL date fields to timezone-aware text format based on delivery location

-- First, let's add new text columns for timezone-aware dates
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS scheduled_pickup_date_tz TEXT,
ADD COLUMN IF NOT EXISTS scheduled_delivery_date_tz TEXT,
ADD COLUMN IF NOT EXISTS actual_pickup_date_tz TEXT,
ADD COLUMN IF NOT EXISTS actual_delivery_date_tz TEXT,
ADD COLUMN IF NOT EXISTS created_at_tz TEXT,
ADD COLUMN IF NOT EXISTS updated_at_tz TEXT;

-- Add timezone-aware columns to delivery_assignments
ALTER TABLE delivery_assignments
ADD COLUMN IF NOT EXISTS assigned_at_tz TEXT,
ADD COLUMN IF NOT EXISTS updated_at_tz TEXT;

-- Add timezone-aware columns to delivery_status_history
ALTER TABLE delivery_status_history
ADD COLUMN IF NOT EXISTS changed_at_tz TEXT;

-- Add timezone-aware columns to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_at_tz TEXT,
ADD COLUMN IF NOT EXISTS updated_at_tz TEXT;

-- Add timezone-aware columns to estimates
ALTER TABLE estimates
ADD COLUMN IF NOT EXISTS created_at_tz TEXT,
ADD COLUMN IF NOT EXISTS updated_at_tz TEXT,
ADD COLUMN IF NOT EXISTS approved_at_tz TEXT;

-- Add timezone-aware columns to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS created_at_tz TEXT,
ADD COLUMN IF NOT EXISTS updated_at_tz TEXT,
ADD COLUMN IF NOT EXISTS due_date_tz TEXT;

-- Function to get timezone abbreviation based on delivery address
CREATE OR REPLACE FUNCTION get_timezone_abbrev(address TEXT)
RETURNS TEXT AS $$
DECLARE
  state_code TEXT;
  is_dst BOOLEAN;
BEGIN
  IF address IS NULL OR address = '' THEN
    RETURN 'EST';
  END IF;
  
  -- Extract state code from address
  state_code := (regexp_matches(address, '\b([A-Z]{2})\b(?:\s+\d{5})?$', 'i'))[1];
  state_code := UPPER(state_code);
  
  -- Check if we're in daylight saving time (March - November)
  is_dst := EXTRACT(month FROM NOW()) BETWEEN 3 AND 10;
  
  -- Return appropriate timezone abbreviation
  CASE 
    WHEN state_code IN ('AL','CT','DE','FL','GA','IN','KY','ME','MD','MA','MI','NH','NJ','NY','NC','OH','PA','RI','SC','TN','VT','VA','WV') THEN
      RETURN CASE WHEN is_dst THEN 'EDT' ELSE 'EST' END;
    WHEN state_code IN ('AR','IL','IA','KS','LA','MN','MS','MO','NE','ND','OK','SD','TX','WI') THEN
      RETURN CASE WHEN is_dst THEN 'CDT' ELSE 'CST' END;
    WHEN state_code IN ('CO','ID','MT','NV','NM','UT','WY') THEN
      RETURN CASE WHEN is_dst THEN 'MDT' ELSE 'MST' END;
    WHEN state_code = 'AZ' THEN
      RETURN 'MST'; -- Arizona doesn't observe DST
    WHEN state_code IN ('CA','OR','WA') THEN
      RETURN CASE WHEN is_dst THEN 'PDT' ELSE 'PST' END;
    ELSE
      RETURN 'EST'; -- Default to Eastern
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to convert UTC timestamp to timezone-aware string
CREATE OR REPLACE FUNCTION convert_utc_to_tz_string(utc_timestamp TIMESTAMPTZ, address TEXT)
RETURNS TEXT AS $$
DECLARE
  tz_abbrev TEXT;
  local_time TIMESTAMP;
  tz_name TEXT;
BEGIN
  IF utc_timestamp IS NULL THEN
    RETURN NULL;
  END IF;
  
  tz_abbrev := get_timezone_abbrev(address);
  
  -- Get timezone name for conversion
  tz_name := CASE 
    WHEN tz_abbrev IN ('EST', 'EDT') THEN 'America/New_York'
    WHEN tz_abbrev IN ('CST', 'CDT') THEN 'America/Chicago'
    WHEN tz_abbrev IN ('MST', 'MDT') THEN 'America/Denver'
    WHEN tz_abbrev IN ('PST', 'PDT') THEN 'America/Los_Angeles'
    ELSE 'America/New_York'
  END;
  
  -- Convert to local time
  local_time := utc_timestamp AT TIME ZONE tz_name;
  
  -- Format as "YYYY-MM-DD HH:MM:SS TZ"
  RETURN to_char(local_time, 'YYYY-MM-DD HH24:MI:SS') || ' ' || tz_abbrev;
END;
$$ LANGUAGE plpgsql;

-- Convert existing delivery data
UPDATE deliveries SET
  scheduled_pickup_date_tz = convert_utc_to_tz_string(scheduled_pickup_date::TIMESTAMPTZ, delivery_address),
  scheduled_delivery_date_tz = convert_utc_to_tz_string(scheduled_delivery_date::TIMESTAMPTZ, delivery_address),
  actual_pickup_date_tz = convert_utc_to_tz_string(actual_pickup_date::TIMESTAMPTZ, delivery_address),
  actual_delivery_date_tz = convert_utc_to_tz_string(actual_delivery_date::TIMESTAMPTZ, delivery_address),
  created_at_tz = convert_utc_to_tz_string(created_at, delivery_address),
  updated_at_tz = convert_utc_to_tz_string(updated_at, delivery_address);

-- Convert delivery assignments data
UPDATE delivery_assignments SET
  assigned_at_tz = convert_utc_to_tz_string(assigned_at, (SELECT delivery_address FROM deliveries WHERE deliveries.id = delivery_assignments.delivery_id)),
  updated_at_tz = convert_utc_to_tz_string(updated_at, (SELECT delivery_address FROM deliveries WHERE deliveries.id = delivery_assignments.delivery_id));

-- Convert delivery status history
UPDATE delivery_status_history SET
  changed_at_tz = convert_utc_to_tz_string(changed_at, (SELECT delivery_address FROM deliveries WHERE deliveries.id = delivery_status_history.delivery_id));

-- Convert orders data
UPDATE orders SET
  created_at_tz = convert_utc_to_tz_string(created_at, 'EST'), -- Default to EST for orders without delivery address
  updated_at_tz = convert_utc_to_tz_string(updated_at, 'EST');

-- Convert estimates data  
UPDATE estimates SET
  created_at_tz = convert_utc_to_tz_string(created_at, delivery_address),
  updated_at_tz = convert_utc_to_tz_string(updated_at, delivery_address),
  approved_at_tz = convert_utc_to_tz_string(approved_at, delivery_address);

-- Convert invoices data
UPDATE invoices SET
  created_at_tz = convert_utc_to_tz_string(created_at, delivery_address),
  updated_at_tz = convert_utc_to_tz_string(updated_at, delivery_address),
  due_date_tz = convert_utc_to_tz_string(due_date::TIMESTAMPTZ, delivery_address);

-- Create triggers to automatically populate timezone-aware fields on insert/update
CREATE OR REPLACE FUNCTION set_timezone_aware_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- For deliveries table
  IF TG_TABLE_NAME = 'deliveries' THEN
    NEW.created_at_tz := convert_utc_to_tz_string(COALESCE(NEW.created_at, NOW()), NEW.delivery_address);
    NEW.updated_at_tz := convert_utc_to_tz_string(NOW(), NEW.delivery_address);
    
    IF NEW.scheduled_pickup_date IS NOT NULL THEN
      NEW.scheduled_pickup_date_tz := convert_utc_to_tz_string(NEW.scheduled_pickup_date::TIMESTAMPTZ, NEW.delivery_address);
    END IF;
    
    IF NEW.scheduled_delivery_date IS NOT NULL THEN
      NEW.scheduled_delivery_date_tz := convert_utc_to_tz_string(NEW.scheduled_delivery_date::TIMESTAMPTZ, NEW.delivery_address);
    END IF;
    
    IF NEW.actual_pickup_date IS NOT NULL THEN
      NEW.actual_pickup_date_tz := convert_utc_to_tz_string(NEW.actual_pickup_date::TIMESTAMPTZ, NEW.delivery_address);
    END IF;
    
    IF NEW.actual_delivery_date IS NOT NULL THEN
      NEW.actual_delivery_date_tz := convert_utc_to_tz_string(NEW.actual_delivery_date::TIMESTAMPTZ, NEW.delivery_address);
    END IF;
  END IF;
  
  -- For delivery_assignments table
  IF TG_TABLE_NAME = 'delivery_assignments' THEN
    NEW.assigned_at_tz := convert_utc_to_tz_string(COALESCE(NEW.assigned_at, NOW()), 
      (SELECT delivery_address FROM deliveries WHERE id = NEW.delivery_id));
    NEW.updated_at_tz := convert_utc_to_tz_string(NOW(), 
      (SELECT delivery_address FROM deliveries WHERE id = NEW.delivery_id));
  END IF;
  
  -- For delivery_status_history table
  IF TG_TABLE_NAME = 'delivery_status_history' THEN
    NEW.changed_at_tz := convert_utc_to_tz_string(COALESCE(NEW.changed_at, NOW()), 
      (SELECT delivery_address FROM deliveries WHERE id = NEW.delivery_id));
  END IF;
  
  -- For estimates table
  IF TG_TABLE_NAME = 'estimates' THEN
    NEW.created_at_tz := convert_utc_to_tz_string(COALESCE(NEW.created_at, NOW()), NEW.delivery_address);
    NEW.updated_at_tz := convert_utc_to_tz_string(NOW(), NEW.delivery_address);
    
    IF NEW.approved_at IS NOT NULL THEN
      NEW.approved_at_tz := convert_utc_to_tz_string(NEW.approved_at, NEW.delivery_address);
    END IF;
  END IF;
  
  -- For invoices table
  IF TG_TABLE_NAME = 'invoices' THEN
    NEW.created_at_tz := convert_utc_to_tz_string(COALESCE(NEW.created_at, NOW()), NEW.delivery_address);
    NEW.updated_at_tz := convert_utc_to_tz_string(NOW(), NEW.delivery_address);
    
    IF NEW.due_date IS NOT NULL THEN
      NEW.due_date_tz := convert_utc_to_tz_string(NEW.due_date::TIMESTAMPTZ, NEW.delivery_address);
    END IF;
  END IF;
  
  -- For orders table
  IF TG_TABLE_NAME = 'orders' THEN
    NEW.created_at_tz := convert_utc_to_tz_string(COALESCE(NEW.created_at, NOW()), 'EST');
    NEW.updated_at_tz := convert_utc_to_tz_string(NOW(), 'EST');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all relevant tables
DROP TRIGGER IF EXISTS set_deliveries_tz_timestamps ON deliveries;
CREATE TRIGGER set_deliveries_tz_timestamps
  BEFORE INSERT OR UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();

DROP TRIGGER IF EXISTS set_delivery_assignments_tz_timestamps ON delivery_assignments;  
CREATE TRIGGER set_delivery_assignments_tz_timestamps
  BEFORE INSERT OR UPDATE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();

DROP TRIGGER IF EXISTS set_delivery_status_history_tz_timestamps ON delivery_status_history;
CREATE TRIGGER set_delivery_status_history_tz_timestamps
  BEFORE INSERT OR UPDATE ON delivery_status_history
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();

DROP TRIGGER IF EXISTS set_estimates_tz_timestamps ON estimates;
CREATE TRIGGER set_estimates_tz_timestamps
  BEFORE INSERT OR UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();

DROP TRIGGER IF EXISTS set_invoices_tz_timestamps ON invoices;
CREATE TRIGGER set_invoices_tz_timestamps
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();

DROP TRIGGER IF EXISTS set_orders_tz_timestamps ON orders;
CREATE TRIGGER set_orders_tz_timestamps
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_timezone_aware_timestamps();