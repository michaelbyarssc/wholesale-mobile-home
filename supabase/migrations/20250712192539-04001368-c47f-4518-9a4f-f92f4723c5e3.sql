-- Create delivery_documents table to track DocuSign documents
CREATE TABLE public.delivery_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id),
  document_type TEXT NOT NULL,
  docusign_envelope_id TEXT,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  signed_at TIMESTAMP WITH TIME ZONE,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all delivery documents" 
ON public.delivery_documents 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view documents for their deliveries" 
ON public.delivery_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers d ON da.driver_id = d.id
    WHERE da.delivery_id = delivery_documents.delivery_id 
    AND d.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_documents_updated_at
BEFORE UPDATE ON public.delivery_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();