-- Step 1: Enhance Role Management Security
-- Add server-side validation for role assignments
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Prevent non-super-admins from creating super_admin roles
  IF NEW.role = 'super_admin' AND NOT (
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Only super administrators can assign super_admin role';
  END IF;
  
  -- Prevent regular users from assigning admin roles
  IF NEW.role IN ('admin', 'super_admin') AND NOT (
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to assign administrative roles';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON user_roles;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_assignment();

-- Step 2: Add Markup Validation
-- Add constraints to customer_markups table
ALTER TABLE public.customer_markups 
ADD CONSTRAINT markup_percentage_range 
CHECK (markup_percentage >= 0 AND markup_percentage <= 100);

ALTER TABLE public.customer_markups 
ADD CONSTRAINT super_admin_markup_percentage_range 
CHECK (super_admin_markup_percentage >= 0 AND super_admin_markup_percentage <= 100);

ALTER TABLE public.customer_markups 
ADD CONSTRAINT minimum_profit_non_negative 
CHECK (minimum_profit_per_home >= 0);

-- Step 3: Enhanced Input Validation Functions
CREATE OR REPLACE FUNCTION public.validate_email_format(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced email validation with more comprehensive regex
  RETURN email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_phone_format(phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  cleaned_phone text;
BEGIN
  -- Remove all non-digits
  cleaned_phone := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Check if it's a valid US phone number (10 digits or 11 digits starting with 1)
  RETURN (length(cleaned_phone) = 10) OR 
         (length(cleaned_phone) = 11 AND substring(cleaned_phone, 1, 1) = '1');
END;
$function$;

-- Step 4: Enhanced Password Security Function
CREATE OR REPLACE FUNCTION public.generate_secure_random_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  uppercase_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  lowercase_chars text := 'abcdefghijklmnopqrstuvwxyz';
  digit_chars text := '0123456789';
  special_chars text := '!@#$%^&*()_+-=[]{}|;:,.<>?';
  all_chars text;
  password text := '';
  i integer;
BEGIN
  all_chars := uppercase_chars || lowercase_chars || digit_chars || special_chars;
  
  -- Ensure at least one character from each category
  password := password || substring(uppercase_chars, floor(random() * length(uppercase_chars) + 1)::int, 1);
  password := password || substring(lowercase_chars, floor(random() * length(lowercase_chars) + 1)::int, 1);
  password := password || substring(digit_chars, floor(random() * length(digit_chars) + 1)::int, 1);
  password := password || substring(special_chars, floor(random() * length(special_chars) + 1)::int, 1);
  
  -- Fill remaining characters randomly
  FOR i IN 5..16 LOOP
    password := password || substring(all_chars, floor(random() * length(all_chars) + 1)::int, 1);
  END LOOP;
  
  RETURN password;
END;
$function$;

-- Step 5: Add rate limiting table for form submissions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- Could be user_id, IP address, etc.
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for rate_limits
CREATE POLICY "System can manage rate limits" ON public.rate_limits
  FOR ALL USING (true);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_attempts integer := 0;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current attempts for this identifier and action
  SELECT attempts, window_start INTO current_attempts, window_start_time
  FROM rate_limits
  WHERE identifier = p_identifier AND action = p_action;
  
  -- If no record exists or window has expired, create/reset
  IF current_attempts IS NULL OR window_start_time < (now() - (p_window_minutes || ' minutes')::interval) THEN
    INSERT INTO rate_limits (identifier, action, attempts, window_start)
    VALUES (p_identifier, p_action, 1, now())
    ON CONFLICT (identifier, action) 
    DO UPDATE SET attempts = 1, window_start = now();
    RETURN true;
  END IF;
  
  -- If within window and under limit, increment and allow
  IF current_attempts < p_max_attempts THEN
    UPDATE rate_limits 
    SET attempts = attempts + 1
    WHERE identifier = p_identifier AND action = p_action;
    RETURN true;
  END IF;
  
  -- Rate limit exceeded
  RETURN false;
END;
$function$;

-- Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_audit_log
CREATE POLICY "Admins can view security audit logs" ON public.security_audit_log
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert security audit logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_success boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO security_audit_log (
    user_id, action, resource_type, resource_id, details, success
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id, p_details, p_success
  );
END;
$function$;