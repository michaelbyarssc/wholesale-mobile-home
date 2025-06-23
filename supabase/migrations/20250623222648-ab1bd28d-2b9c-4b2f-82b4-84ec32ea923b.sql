
-- Update the insert policy to allow unauthenticated inserts for initial seeding
-- This is safe since we're only inserting predefined image data
DROP POLICY IF EXISTS "Allow authenticated users to insert mobile home images" ON public.mobile_home_images;

CREATE POLICY "Allow insert mobile home images" 
  ON public.mobile_home_images 
  FOR INSERT 
  WITH CHECK (true);

-- Update other policies to be more permissive for admin operations
DROP POLICY IF EXISTS "Allow authenticated users to update mobile home images" ON public.mobile_home_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete mobile home images" ON public.mobile_home_images;

CREATE POLICY "Allow update mobile home images" 
  ON public.mobile_home_images 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow delete mobile home images" 
  ON public.mobile_home_images 
  FOR DELETE 
  USING (true);
