
-- Add user_id column to estimates table to link estimates to users
ALTER TABLE public.estimates 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for estimates to allow users to see their own estimates
DROP POLICY IF EXISTS "Anyone can create estimates" ON public.estimates;
DROP POLICY IF EXISTS "Admins can view all estimates" ON public.estimates;
DROP POLICY IF EXISTS "Admins can update estimates" ON public.estimates;

-- Allow authenticated users to create their own estimates
CREATE POLICY "Users can create their own estimates" 
  ON public.estimates 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own estimates
CREATE POLICY "Users can view their own estimates" 
  ON public.estimates 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to create estimates (for non-logged in users)
CREATE POLICY "Anonymous users can create estimates" 
  ON public.estimates 
  FOR INSERT 
  TO anon
  WITH CHECK (user_id IS NULL);

-- Admins can view all estimates
CREATE POLICY "Admins can view all estimates" 
  ON public.estimates 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can update all estimates
CREATE POLICY "Admins can update all estimates" 
  ON public.estimates 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
