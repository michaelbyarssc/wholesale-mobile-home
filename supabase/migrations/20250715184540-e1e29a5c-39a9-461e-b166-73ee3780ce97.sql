-- Create transaction numbering sequence starting at 001027
CREATE SEQUENCE IF NOT EXISTS public.transaction_number_seq START WITH 1027;

-- Create transaction status enum
CREATE TYPE public.transaction_status AS ENUM (
  'draft',
  'estimate_submitted', 
  'estimate_approved',
  'invoice_generated',
  'payment_partial',
  'payment_complete',
  'delivery_scheduled',
  'delivery_in_progress',
  'delivery_complete',
  'completed',
  'cancelled',
  'expired'
);

-- Create transaction priority enum
CREATE TYPE public.transaction_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create transaction type enum  
CREATE TYPE public.transaction_type AS ENUM ('sale', 'repair', 'service', 'delivery_only');

-- Create comprehensive transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number text NOT NULL UNIQUE,
  transaction_type transaction_type NOT NULL DEFAULT 'sale',
  status transaction_status NOT NULL DEFAULT 'draft',
  priority transaction_priority NOT NULL DEFAULT 'medium',
  
  -- Customer information
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  delivery_address text,
  
  -- Mobile home and services
  mobile_home_id uuid REFERENCES public.mobile_homes(id),
  selected_services uuid[] DEFAULT '{}',
  selected_home_options jsonb DEFAULT '[]',
  
  -- Financial information
  base_amount numeric(10,2) NOT NULL DEFAULT 0,
  service_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  balance_due numeric(10,2) NOT NULL DEFAULT 0,
  
  -- User and assignment
  user_id uuid REFERENCES auth.users(id),
  assigned_admin_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  
  -- Timestamps and deadlines
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  estimate_expires_at timestamp with time zone,
  invoice_expires_at timestamp with time zone,
  scheduled_delivery_date timestamp with time zone,
  completed_at timestamp with time zone,
  
  -- Additional fields
  preferred_contact text,
  timeline text,
  additional_requirements text,
  internal_notes text,
  user_notes text,
  
  -- Integration fields
  quickbooks_id text,
  quickbooks_synced_at timestamp with time zone,
  
  -- Legacy integration fields
  estimate_id uuid REFERENCES public.estimates(id),
  invoice_id uuid REFERENCES public.invoices(id),
  
  -- Repair specific fields
  repair_description text,
  repair_category text,
  repair_urgency text,
  repair_completed_at timestamp with time zone,
  
  -- File attachments
  attachment_urls jsonb DEFAULT '[]'
);

-- Create transaction stage history table for audit trail
CREATE TABLE IF NOT EXISTS public.transaction_stage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  from_status transaction_status,
  to_status transaction_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'
);

-- Create transaction notes table
CREATE TABLE IF NOT EXISTS public.transaction_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create transaction payments table
CREATE TABLE IF NOT EXISTS public.transaction_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'cash',
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  payment_reference text,
  recorded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create transaction settings table
CREATE TABLE IF NOT EXISTS public.transaction_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create transaction notifications table
CREATE TABLE IF NOT EXISTS public.transaction_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON public.transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_assigned_admin ON public.transactions(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_number ON public.transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transaction_stage_history_transaction_id ON public.transaction_stage_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notes_transaction_id ON public.transaction_notes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_payments_transaction_id ON public.transaction_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_user_id ON public.transaction_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_read_at ON public.transaction_notifications(read_at);

-- Enable RLS on all tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_notifications ENABLE ROW LEVEL SECURITY;

-- Create function to generate transaction numbers
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'WMH-' || LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
END;
$function$;

-- Create trigger to auto-generate transaction numbers
CREATE OR REPLACE FUNCTION public.auto_generate_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_transaction_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_transaction_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic stage history logging
CREATE OR REPLACE FUNCTION public.log_transaction_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.transaction_stage_history (
      transaction_id, from_status, to_status, changed_by, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), 
      CASE 
        WHEN OLD.status IS NULL THEN 'Transaction created'
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create function to update balance calculations
CREATE OR REPLACE FUNCTION public.update_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the transaction balance when a payment is added
    UPDATE public.transactions 
    SET 
      paid_amount = paid_amount + NEW.amount,
      balance_due = total_amount - (paid_amount + NEW.amount),
      status = CASE 
        WHEN (total_amount - (paid_amount + NEW.amount)) <= 0 THEN 'payment_complete'::transaction_status
        WHEN (paid_amount + NEW.amount) > 0 THEN 'payment_partial'::transaction_status
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.transaction_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Update the transaction balance when a payment is removed
    UPDATE public.transactions 
    SET 
      paid_amount = paid_amount - OLD.amount,
      balance_due = total_amount - (paid_amount - OLD.amount),
      status = CASE 
        WHEN (paid_amount - OLD.amount) <= 0 THEN 'invoice_generated'::transaction_status
        WHEN (total_amount - (paid_amount - OLD.amount)) <= 0 THEN 'payment_complete'::transaction_status
        ELSE 'payment_partial'::transaction_status
      END,
      updated_at = now()
    WHERE id = OLD.transaction_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create triggers
CREATE TRIGGER trigger_auto_transaction_number
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_transaction_number();

CREATE TRIGGER trigger_transaction_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_transaction_updated_at();

CREATE TRIGGER trigger_transaction_stage_history
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_stage_change();

CREATE TRIGGER trigger_transaction_balance_update
  AFTER INSERT OR DELETE ON public.transaction_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_transaction_balance();

-- Insert default transaction settings
INSERT INTO public.transaction_settings (setting_key, setting_value, description) VALUES
('estimate_expiry_days', '7', 'Default number of days before estimates expire'),
('invoice_expiry_days', '14', 'Default number of days before invoices expire'),
('auto_assign_admins', 'true', 'Automatically assign admins to new transactions'),
('require_delivery_photos', 'true', 'Require photos for delivery completion'),
('enable_email_notifications', 'true', 'Enable email notifications for transaction updates'),
('enable_sms_notifications', 'false', 'Enable SMS notifications for transaction updates'),
('auto_sync_quickbooks', 'true', 'Automatically sync with QuickBooks'),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', '["jpg", "jpeg", "png", "pdf", "doc", "docx"]', 'Allowed file types for uploads')
ON CONFLICT (setting_key) DO NOTHING;