-- Drop all policies and create new ones with unique names
DROP POLICY IF EXISTS "Allow admin full access" ON public.testimonials;
DROP POLICY IF EXISTS "Allow anonymous testimonial submissions" ON public.testimonials;
DROP POLICY IF EXISTS "Allow viewing approved testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_insert_policy" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_select_policy" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_admin_policy" ON public.testimonials;

-- Create completely new policies with unique names
CREATE POLICY "public_can_insert_testimonials" 
ON public.testimonials 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "public_can_view_approved_testimonials" 
ON public.testimonials 
FOR SELECT 
USING (approved = true OR is_admin(auth.uid()));

CREATE POLICY "admins_can_manage_testimonials" 
ON public.testimonials 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));