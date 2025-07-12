-- Create invoice system tables
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  estimate_id UUID REFERENCES public.estimates(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  billing_address TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_due NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  deposit_amount NUMERIC,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms TEXT NOT NULL DEFAULT 'net_30',
  due_date DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('mobile_home', 'service', 'option', 'fee', 'discount')),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  mobile_home_id UUID REFERENCES public.mobile_homes(id),
  service_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice payments table
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_wire', 'check', 'credit_card', 'financing')),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice reminders table
CREATE TABLE public.invoice_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('first_notice', 'second_notice', 'final_notice', 'custom')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('email', 'sms', 'both')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice audit log table
CREATE TABLE public.invoice_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all invoice tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Admins can manage all invoices" ON public.invoices
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.estimates WHERE id = estimate_id
    ) OR 
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create RLS policies for invoice line items
CREATE POLICY "Users can view line items for accessible invoices" ON public.invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE 
        is_admin(auth.uid()) OR 
        auth.uid() IN (SELECT user_id FROM public.estimates WHERE id = estimate_id) OR
        customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all line items" ON public.invoice_line_items
  FOR ALL USING (is_admin(auth.uid()));

-- Create RLS policies for payments
CREATE POLICY "Admins can manage all payments" ON public.invoice_payments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view payments for their invoices" ON public.invoice_payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE 
        auth.uid() IN (SELECT user_id FROM public.estimates WHERE id = estimate_id) OR
        customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create RLS policies for reminders and audit log
CREATE POLICY "Admins can manage all reminders" ON public.invoice_reminders
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs" ON public.invoice_audit_log
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.invoice_audit_log
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_invoices_estimate_id ON public.invoices(estimate_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_customer_email ON public.invoices(customer_email);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_reminders_invoice_id ON public.invoice_reminders(invoice_id);

-- Create triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice status based on payment amount
  UPDATE public.invoices 
  SET 
    status = CASE
      WHEN amount_paid = 0 THEN 
        CASE 
          WHEN due_date < CURRENT_DATE THEN 'overdue'
          WHEN sent_at IS NOT NULL THEN 'sent'
          ELSE 'draft'
        END
      WHEN amount_paid >= total_amount THEN 'paid'
      WHEN amount_paid > 0 THEN 'partially_paid'
      ELSE status
    END,
    paid_at = CASE 
      WHEN amount_paid >= total_amount AND paid_at IS NULL THEN now()
      WHEN amount_paid < total_amount THEN NULL
      ELSE paid_at
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update invoice status when payments change
CREATE TRIGGER update_invoice_status_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status();

-- Create function to generate invoice from estimate
CREATE OR REPLACE FUNCTION public.generate_invoice_from_estimate(estimate_uuid UUID)
RETURNS UUID AS $$
DECLARE
  estimate_record RECORD;
  new_invoice_id UUID;
  new_invoice_number TEXT;
  line_item_id UUID;
BEGIN
  -- Get estimate details
  SELECT * INTO estimate_record
  FROM public.estimates
  WHERE id = estimate_uuid AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found or not approved';
  END IF;
  
  -- Check if invoice already exists
  IF estimate_record.invoice_id IS NOT NULL THEN
    RETURN estimate_record.invoice_id;
  END IF;
  
  -- Generate invoice number
  new_invoice_number := generate_invoice_number();
  
  -- Create invoice
  INSERT INTO public.invoices (
    invoice_number,
    estimate_id,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    billing_address,
    total_amount,
    deposit_amount,
    due_date,
    created_by
  ) VALUES (
    new_invoice_number,
    estimate_record.id,
    estimate_record.customer_name,
    estimate_record.customer_email,
    estimate_record.customer_phone,
    estimate_record.delivery_address,
    estimate_record.delivery_address, -- Use delivery as billing for now
    estimate_record.total_amount,
    estimate_record.total_amount * 0.10, -- 10% deposit by default
    CURRENT_DATE + INTERVAL '30 days',
    auth.uid()
  ) RETURNING id INTO new_invoice_id;
  
  -- Add mobile home line item
  INSERT INTO public.invoice_line_items (
    invoice_id,
    item_type,
    description,
    quantity,
    unit_price,
    mobile_home_id
  )
  SELECT 
    new_invoice_id,
    'mobile_home',
    CONCAT(mh.manufacturer, ' ', mh.model, ' - ', mh.width_feet, 'x', mh.length_feet),
    1,
    estimate_record.total_amount,
    estimate_record.mobile_home_id
  FROM public.mobile_homes mh
  WHERE mh.id = estimate_record.mobile_home_id;
  
  -- Add service line items if any
  IF estimate_record.selected_services IS NOT NULL THEN
    INSERT INTO public.invoice_line_items (
      invoice_id,
      item_type,
      description,
      quantity,
      unit_price,
      service_id
    )
    SELECT 
      new_invoice_id,
      'service',
      service_name,
      1,
      service_price,
      service_name
    FROM jsonb_to_recordset(estimate_record.selected_services) 
    AS services(service_name TEXT, service_price NUMERIC);
  END IF;
  
  -- Update estimate with invoice reference
  UPDATE public.estimates
  SET invoice_id = new_invoice_id, updated_at = now()
  WHERE id = estimate_uuid;
  
  -- Log the action
  INSERT INTO public.invoice_audit_log (
    invoice_id,
    action,
    new_values,
    user_id
  ) VALUES (
    new_invoice_id,
    'invoice_created',
    jsonb_build_object('estimate_id', estimate_uuid, 'invoice_number', new_invoice_number),
    auth.uid()
  );
  
  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;