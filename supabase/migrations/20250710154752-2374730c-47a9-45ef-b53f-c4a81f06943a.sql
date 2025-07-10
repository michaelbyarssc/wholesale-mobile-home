-- Fix testimonials RLS policies for anonymous users
DROP POLICY IF EXISTS "Allow public testimonial submissions" ON public.testimonials;

-- Create a more explicit policy for anonymous testimonial submissions
CREATE POLICY "Allow anonymous testimonial submissions" 
ON public.testimonials 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure the select policy works for both anon and authenticated users
DROP POLICY IF EXISTS "Allow viewing approved testimonials" ON public.testimonials;

CREATE POLICY "Allow viewing approved testimonials" 
ON public.testimonials 
FOR SELECT 
TO anon, authenticated
USING (approved = true);