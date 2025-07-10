-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Admins can manage all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can submit testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can view approved testimonials" ON public.testimonials;

-- Create proper policies for testimonials
-- Allow anyone to insert testimonials
CREATE POLICY "Allow public testimonial submissions" 
ON public.testimonials 
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow anyone to view approved testimonials  
CREATE POLICY "Allow viewing approved testimonials" 
ON public.testimonials 
FOR SELECT 
TO public
USING (approved = true);

-- Allow admins to manage all testimonials
CREATE POLICY "Allow admin full access" 
ON public.testimonials 
FOR ALL 
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));