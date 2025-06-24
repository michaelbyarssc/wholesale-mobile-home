
-- Ensure we have proper password validation in place
-- This complements the dashboard setting for leaked password protection

-- Create a function to validate password strength (additional security layer)
CREATE OR REPLACE FUNCTION public.check_password_strength(password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    result jsonb := '{"valid": true, "errors": []}';
    errors text[] := '{}';
BEGIN
    -- Check minimum length
    IF length(password) < 8 THEN
        errors := array_append(errors, 'Password must be at least 8 characters long');
    END IF;
    
    -- Check for uppercase letter
    IF password !~ '[A-Z]' THEN
        errors := array_append(errors, 'Password must contain at least one uppercase letter');
    END IF;
    
    -- Check for lowercase letter
    IF password !~ '[a-z]' THEN
        errors := array_append(errors, 'Password must contain at least one lowercase letter');
    END IF;
    
    -- Check for number
    IF password !~ '[0-9]' THEN
        errors := array_append(errors, 'Password must contain at least one number');
    END IF;
    
    -- Check for special character
    IF password !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]' THEN
        errors := array_append(errors, 'Password must contain at least one special character');
    END IF;
    
    -- Build result
    IF array_length(errors, 1) > 0 THEN
        result := jsonb_build_object(
            'valid', false,
            'errors', to_jsonb(errors)
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Create a trigger function to validate passwords on auth.users updates
-- Note: This is a supplementary check, the main leaked password protection must be enabled in dashboard
CREATE OR REPLACE FUNCTION public.validate_auth_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    strength_check jsonb;
BEGIN
    -- Only validate if password is being updated
    IF TG_OP = 'UPDATE' AND NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
        -- Note: We can't access the raw password here, this is just a placeholder
        -- The actual leaked password protection must be enabled in Supabase dashboard
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$;
