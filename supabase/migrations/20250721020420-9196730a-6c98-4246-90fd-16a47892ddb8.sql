-- Find and fix the set_timezone_aware_timestamps function that's causing the error
-- First, let's see if this function exists and drop it
DROP FUNCTION IF EXISTS public.set_timezone_aware_timestamps() CASCADE;

-- Remove any triggers that might be using the old function
DROP TRIGGER IF EXISTS set_delivery_timezone_timestamps ON public.deliveries;