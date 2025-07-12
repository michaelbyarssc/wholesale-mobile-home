-- Enable RLS on docusign_templates table if not already enabled
ALTER TABLE public.docusign_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for docusign_templates table
CREATE POLICY "Admins can manage all DocuSign templates" 
ON public.docusign_templates 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Allow anyone to view active templates (needed for estimate sending)
CREATE POLICY "Anyone can view active DocuSign templates" 
ON public.docusign_templates 
FOR SELECT 
USING (active = true);