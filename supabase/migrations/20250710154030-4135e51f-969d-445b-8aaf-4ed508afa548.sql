-- Add INSERT policy for testimonials
CREATE POLICY "Anyone can submit testimonials" 
ON public.testimonials 
FOR INSERT 
WITH CHECK (true);