-- Fix search path security warnings for timezone functions

-- Update get_timezone_abbrev function with proper security
CREATE OR REPLACE FUNCTION public.get_timezone_abbrev(address text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update convert_utc_to_tz_string function with proper security
CREATE OR REPLACE FUNCTION public.convert_utc_to_tz_string(utc_timestamp timestamp with time zone, address text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update set_timezone_aware_timestamps function with proper security
CREATE OR REPLACE FUNCTION public.set_timezone_aware_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  address_text TEXT;
BEGIN
  -- Determine address based on table
  CASE TG_TABLE_NAME
    WHEN 'deliveries' THEN
      address_text := NEW.delivery_address;
    WHEN 'delivery_assignments' THEN
      SELECT delivery_address INTO address_text FROM deliveries WHERE id = NEW.delivery_id;
    WHEN 'delivery_status_history' THEN
      SELECT delivery_address INTO address_text FROM deliveries WHERE id = NEW.delivery_id;
    WHEN 'orders' THEN
      SELECT delivery_address INTO address_text FROM deliveries WHERE id = NEW.id LIMIT 1;
      IF address_text IS NULL THEN
        SELECT delivery_address INTO address_text FROM estimates WHERE id = NEW.estimate_id;
      END IF;
    WHEN 'estimates' THEN
      address_text := NEW.delivery_address;
    WHEN 'invoices' THEN
      address_text := NEW.delivery_address;
    ELSE
      address_text := NULL;
  END CASE;
  
  -- Set timezone-aware timestamps for relevant columns
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Handle deliveries table
    IF TG_TABLE_NAME = 'deliveries' THEN
      NEW.delivery_date_tz := convert_utc_to_tz_string(NEW.delivery_date, address_text);
      NEW.scheduled_pickup_date_tz := convert_utc_to_tz_string(NEW.scheduled_pickup_date, address_text);
      NEW.actual_pickup_date_tz := convert_utc_to_tz_string(NEW.actual_pickup_date, address_text);
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
      NEW.updated_at_tz := convert_utc_to_tz_string(NEW.updated_at, address_text);
    END IF;
    
    -- Handle delivery_assignments table
    IF TG_TABLE_NAME = 'delivery_assignments' THEN
      NEW.assigned_at_tz := convert_utc_to_tz_string(NEW.assigned_at, address_text);
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
    END IF;
    
    -- Handle delivery_status_history table
    IF TG_TABLE_NAME = 'delivery_status_history' THEN
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
    END IF;
    
    -- Handle orders table
    IF TG_TABLE_NAME = 'orders' THEN
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
      NEW.updated_at_tz := convert_utc_to_tz_string(NEW.updated_at, address_text);
    END IF;
    
    -- Handle estimates table
    IF TG_TABLE_NAME = 'estimates' THEN
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
      NEW.updated_at_tz := convert_utc_to_tz_string(NEW.updated_at, address_text);
      NEW.approved_at_tz := convert_utc_to_tz_string(NEW.approved_at, address_text);
    END IF;
    
    -- Handle invoices table
    IF TG_TABLE_NAME = 'invoices' THEN
      NEW.created_at_tz := convert_utc_to_tz_string(NEW.created_at, address_text);
      NEW.updated_at_tz := convert_utc_to_tz_string(NEW.updated_at, address_text);
      NEW.due_date_tz := convert_utc_to_tz_string(NEW.due_date, address_text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;