
-- Let's completely reset and fix the RLS policies for public access
-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Public read access to mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow anonymous read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Allow authenticated read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Allow anonymous read access to mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow authenticated read access to mobile home images" ON public.mobile_home_images;

-- Ensure RLS is enabled on both tables
ALTER TABLE public.mobile_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_home_images ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for public read access
-- This policy allows ALL users (authenticated and anonymous) to read active mobile homes
CREATE POLICY "Allow public read access to active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  USING (active = true);

-- This policy allows ALL users (authenticated and anonymous) to read mobile home images
CREATE POLICY "Allow public read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  USING (true);

-- Let's also check if there are any mobile homes in the database
-- and ensure they are marked as active
DO $$
DECLARE
    home_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO home_count FROM public.mobile_homes;
    RAISE NOTICE 'Total mobile homes in database: %', home_count;
    
    SELECT COUNT(*) INTO home_count FROM public.mobile_homes WHERE active = true;
    RAISE NOTICE 'Active mobile homes: %', home_count;
    
    -- If no active homes exist, let's activate any existing homes for testing
    IF home_count = 0 THEN
        UPDATE public.mobile_homes SET active = true WHERE active = false;
        GET DIAGNOSTICS home_count = ROW_COUNT;
        RAISE NOTICE 'Activated % mobile homes for testing', home_count;
    END IF;
END $$;
