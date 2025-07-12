-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Admins can manage all DocuSign templates" ON public.docusign_templates;
DROP POLICY IF EXISTS "Anyone can view active DocuSign templates" ON public.docusign_templates;

-- Create more permissive policies for now to allow template creation
CREATE POLICY "Authenticated users can manage DocuSign templates" 
ON public.docusign_templates 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Note: You can make this more restrictive later once admin roles are properly set up