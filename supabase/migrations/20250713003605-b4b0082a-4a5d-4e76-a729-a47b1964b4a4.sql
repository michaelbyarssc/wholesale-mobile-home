-- Create payments table to track payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add balance_due column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10,2) DEFAULT 0;

-- Update existing invoices to set balance_due equal to total_amount for unpaid invoices
UPDATE public.invoices 
SET balance_due = total_amount 
WHERE status != 'paid' AND balance_due IS NULL;

-- Update invoice INV-001000 to be unpaid with full balance
UPDATE public.invoices 
SET 
  status = 'sent',
  balance_due = total_amount,
  paid_at = NULL
WHERE invoice_number = 'INV-001000';

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Admins can manage all payments" ON public.payments
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view payments for their invoices" ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = payments.invoice_id 
    AND invoices.user_id = auth.uid()
  )
);

-- Add trigger to update invoice updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update invoice balance when payment is made
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the invoice balance_due when a payment is added
  IF TG_OP = 'INSERT' THEN
    UPDATE public.invoices 
    SET 
      balance_due = GREATEST(0, balance_due - NEW.amount),
      status = CASE 
        WHEN (balance_due - NEW.amount) <= 0 THEN 'paid'
        ELSE 'sent'
      END,
      paid_at = CASE 
        WHEN (balance_due - NEW.amount) <= 0 THEN now()
        ELSE paid_at
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
  
  -- Handle payment deletion (refund scenario)
  IF TG_OP = 'DELETE' THEN
    UPDATE public.invoices 
    SET 
      balance_due = balance_due + OLD.amount,
      status = 'sent',
      paid_at = NULL,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;