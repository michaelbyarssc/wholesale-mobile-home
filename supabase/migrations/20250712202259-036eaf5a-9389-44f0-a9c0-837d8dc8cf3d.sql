-- Create DocuSign templates table for estimate management
CREATE TABLE public.docusign_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL UNIQUE,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'estimate',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.docusign_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for DocuSign templates
CREATE POLICY "Admins can manage all DocuSign templates" 
ON public.docusign_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_docusign_templates_updated_at
  BEFORE UPDATE ON public.docusign_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();