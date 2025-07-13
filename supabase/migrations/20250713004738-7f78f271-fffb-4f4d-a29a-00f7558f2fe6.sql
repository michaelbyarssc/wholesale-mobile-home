-- Create estimate_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.estimate_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_id UUID NOT NULL,
    document_type TEXT NOT NULL,
    docusign_envelope_id TEXT,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    template_id TEXT,
    template_name TEXT,
    document_url TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
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

CREATE POLICY "System can insert documents" 
ON public.estimate_documents 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_estimate_documents_updated_at
BEFORE UPDATE ON public.estimate_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint
ALTER TABLE public.estimate_documents 
ADD CONSTRAINT estimate_documents_estimate_id_fkey 
FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;