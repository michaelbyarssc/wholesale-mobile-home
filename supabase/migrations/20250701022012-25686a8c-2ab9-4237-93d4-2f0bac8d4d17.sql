
-- First, let's check the current RLS policies and fix them
-- Drop any existing policies that might be too restrictive
DROP POLICY IF EXISTS "Allow anonymous read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Allow authenticated read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Allow anonymous read access to mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow authenticated read access to mobile home images" ON public.mobile_home_images;

-- Create comprehensive policies that allow both anonymous and authenticated users to read mobile homes
CREATE POLICY "Public read access to active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  USING (active = true);

-- Allow public read access to all mobile home images
CREATE POLICY "Public read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  USING (true);

-- Make sure RLS is enabled but allows the public access we just defined
ALTER TABLE public.mobile_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_home_images ENABLE ROW LEVEL SECURITY;

-- Also check if there are any mobile homes in the database
-- If this returns 0, that might be why nothing is showing
SELECT COUNT(*) as total_homes, COUNT(*) FILTER (WHERE active = true) as active_homes FROM public.mobile_homes;
