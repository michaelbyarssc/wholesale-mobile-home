
-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Add RLS policies for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policy for customers to view their own invoices
CREATE POLICY "view_own_invoices" ON public.invoices
  FOR SELECT
  USING (user_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy for admins to view all invoices
CREATE POLICY "admin_view_invoices" ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add approval fields to estimates table
ALTER TABLE public.estimates 
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approval_token TEXT UNIQUE,
ADD COLUMN invoice_id UUID REFERENCES public.invoices(id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to approve estimate and create invoice
CREATE OR REPLACE FUNCTION approve_estimate(estimate_uuid UUID)
RETURNS UUID AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  new_invoice_number TEXT;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND approved_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found or already approved';
  END IF;
  
  -- Generate invoice number
  new_invoice_number := generate_invoice_number();
  
  -- Create invoice
  INSERT INTO public.invoices (
    estimate_id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    total_amount,
    user_id
  ) VALUES (
    estimate_record.id,
    new_invoice_number,
    estimate_record.customer_name,
    estimate_record.customer_email,
    estimate_record.customer_phone,
    estimate_record.delivery_address,
    estimate_record.total_amount,
    estimate_record.user_id
  ) RETURNING id INTO new_invoice_id;
  
  -- Update estimate
  UPDATE public.estimates
  SET 
    approved_at = now(),
    status = 'approved',
    invoice_id = new_invoice_id,
    updated_at = now()
  WHERE id = estimate_uuid;
  
  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
