-- Temporarily disable RLS to test, then re-enable with simpler policies
ALTER TABLE public.testimonials DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.testimonials;
DROP POLICY IF EXISTS "Allow anonymous testimonial submissions" ON public.testimonials;
DROP POLICY IF EXISTS "Allow viewing approved testimonials" ON public.testimonials;

-- Re-enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible INSERT policy
CREATE POLICY "testimonials_insert_policy" 
ON public.testimonials 
FOR INSERT 
WITH CHECK (true);

-- Create SELECT policy for approved testimonials
CREATE POLICY "testimonials_select_policy" 
ON public.testimonials 
FOR SELECT 
USING (approved = true);

-- Create admin policy
CREATE POLICY "testimonials_admin_policy" 
ON public.testimonials 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));