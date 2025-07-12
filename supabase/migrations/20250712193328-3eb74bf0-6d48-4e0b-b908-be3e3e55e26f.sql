-- Create estimate_documents table to track DocuSign documents for estimates and invoices
CREATE TABLE public.estimate_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id),
  document_type TEXT NOT NULL,
  docusign_envelope_id TEXT,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  template_id TEXT,
  template_name TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all estimate documents" 
ON public.estimate_documents 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view documents for their estimates" 
ON public.estimate_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM estimates
    WHERE estimates.id = estimate_documents.estimate_id 
    AND estimates.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_estimate_documents_updated_at
BEFORE UPDATE ON public.estimate_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();