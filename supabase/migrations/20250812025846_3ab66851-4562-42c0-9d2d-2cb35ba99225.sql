-- Secure customer_tracking_sessions: remove public read, enforce token-based access, restrict updates

-- 1) Drop overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view active tracking sessions" ON public.customer_tracking_sessions;

-- 2) Ensure RLS is enabled (idempotent)
ALTER TABLE public.customer_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- 3) Create/replace a trigger to restrict non-admin updates to last_viewed only
CREATE OR REPLACE FUNCTION public.restrict_customer_tracking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow admins full control
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For non-admins (e.g., token-based updates), only last_viewed may change
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
     OR NEW.session_token IS DISTINCT FROM OLD.session_token
     OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only last_viewed can be updated with tracking token access';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger to be safe
DROP TRIGGER IF EXISTS restrict_customer_tracking_updates ON public.customer_tracking_sessions;
CREATE TRIGGER restrict_customer_tracking_updates
BEFORE UPDATE ON public.customer_tracking_sessions
FOR EACH ROW
EXECUTE FUNCTION public.restrict_customer_tracking_updates();
