-- Secure newsletter_subscribers table with proper RLS
-- 1) Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 2) Ensure only admins can read subscriber data
-- Use RESTRICTIVE policy so it must pass even if permissive policies exist
CREATE POLICY IF NOT EXISTS "Only admins can select newsletter subscribers"
AS RESTRICTIVE
ON public.newsletter_subscribers
FOR SELECT
USING (is_admin(auth.uid()));

-- 3) Allow anyone (including anonymous visitors) to subscribe
CREATE POLICY IF NOT EXISTS "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

-- 4) Only admins can update subscriber records
CREATE POLICY IF NOT EXISTS "Only admins can update newsletter subscribers"
AS RESTRICTIVE
ON public.newsletter_subscribers
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 5) Only admins can delete subscriber records
CREATE POLICY IF NOT EXISTS "Only admins can delete newsletter subscribers"
AS RESTRICTIVE
ON public.newsletter_subscribers
FOR DELETE
USING (is_admin(auth.uid()));