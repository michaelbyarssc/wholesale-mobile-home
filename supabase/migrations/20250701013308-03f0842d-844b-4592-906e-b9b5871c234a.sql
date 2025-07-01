
-- Check if there are any RLS policies that might be blocking the mobile_homes query
-- and ensure the mobile_homes table has proper policies for public access

-- Enable RLS on mobile_homes if not already enabled
ALTER TABLE public.mobile_homes ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to active mobile homes
DROP POLICY IF EXISTS "Allow public read access to active mobile homes" ON public.mobile_homes;
CREATE POLICY "Allow public read access to active mobile homes" 
  ON public.mobile_homes 
  FOR SELECT 
  TO PUBLIC
  USING (active = true);

-- Also ensure mobile_home_images can be read publicly
ALTER TABLE public.mobile_home_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to mobile home images" ON public.mobile_home_images;
CREATE POLICY "Allow public read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  TO PUBLIC
  USING (true);

-- Check if the profiles table changes are interfering with authentication
-- Ensure the handle_new_user function is working correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone_number, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    false -- New users are not approved by default
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    updated_at = now();
  
  RETURN NEW;
END;
$$;
