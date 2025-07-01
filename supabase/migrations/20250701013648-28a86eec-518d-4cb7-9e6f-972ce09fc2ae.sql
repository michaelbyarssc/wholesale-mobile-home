
-- Fix the RLS policies to allow truly public access without authentication
-- The current policies are still requiring authentication even though we set them to PUBLIC

-- Drop the existing policies and recreate them properly
DROP POLICY IF EXISTS "Allow public read access to active mobile homes" ON public.mobile_homes;
DROP POLICY IF EXISTS "Allow public read access to mobile home images" ON public.mobile_home_images;

-- Create policies that allow anonymous (not logged in) users to read active mobile homes
CREATE POLICY "Allow anonymous read access to active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  TO anon
  USING (active = true);

-- Create policies that allow authenticated users to read active mobile homes  
CREATE POLICY "Allow authenticated read access to active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  TO authenticated
  USING (active = true);

-- Allow anonymous users to read mobile home images
CREATE POLICY "Allow anonymous read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  TO anon
  USING (true);

-- Allow authenticated users to read mobile home images
CREATE POLICY "Allow authenticated read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  TO authenticated
  USING (true);
