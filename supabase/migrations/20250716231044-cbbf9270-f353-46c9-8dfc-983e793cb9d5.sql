-- Create customer avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-avatars', 'customer-avatars', true);

-- Create storage policies for customer avatars
CREATE POLICY "Anyone can view customer avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'customer-avatars');

CREATE POLICY "Users can upload customer avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'customer-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update customer avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'customer-avatars' AND auth.uid() IS NOT NULL);

-- Add transaction_number column to all relevant tables
ALTER TABLE estimates ADD COLUMN transaction_number TEXT;
ALTER TABLE invoices ADD COLUMN transaction_number TEXT;
ALTER TABLE deliveries ADD COLUMN transaction_number TEXT;
ALTER TABLE payments ADD COLUMN transaction_number TEXT;
ALTER TABLE transactions ADD COLUMN display_number TEXT; -- For the WMH-X-#### format

-- Add customer info columns to user profiles for avatars and colors
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN customer_color TEXT;

-- Update the generate_transaction_number function to return just the base number
CREATE OR REPLACE FUNCTION public.generate_base_transaction_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LPAD(nextval('transaction_number_seq')::TEXT, 6, '0');
END;
$function$;

-- Function to generate formatted transaction number by type
CREATE OR REPLACE FUNCTION public.generate_formatted_transaction_number(record_type TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_number TEXT;
  prefix TEXT;
BEGIN
  base_number := generate_base_transaction_number();
  
  CASE record_type
    WHEN 'estimate' THEN prefix := 'WMH-E-';
    WHEN 'invoice' THEN prefix := 'WMH-I-';
    WHEN 'delivery' THEN prefix := 'WMH-D-';
    WHEN 'payment' THEN prefix := 'WMH-P-';
    WHEN 'transaction' THEN prefix := 'WMH-T-';
    ELSE prefix := 'WMH-X-';
  END CASE;
  
  RETURN prefix || base_number;
END;
$function$;

-- Function to extract base number from formatted transaction number
CREATE OR REPLACE FUNCTION public.extract_base_transaction_number(formatted_number TEXT)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  -- Extract the number part after the last dash
  RETURN split_part(formatted_number, '-', 3);
END;
$function$;

-- Backfill transaction numbers for existing records
-- Start with estimates and propagate to related records
DO $$
DECLARE
  estimate_record RECORD;
  base_number TEXT;
  formatted_number TEXT;
  related_invoice_id UUID;
  related_delivery_id UUID;
BEGIN
  -- First, assign transaction numbers to estimates and propagate
  FOR estimate_record IN 
    SELECT id, invoice_id FROM estimates WHERE transaction_number IS NULL
  LOOP
    -- Generate base number for this estimate chain
    base_number := generate_base_transaction_number();
    formatted_number := 'WMH-E-' || base_number;
    
    -- Update the estimate
    UPDATE estimates 
    SET transaction_number = formatted_number 
    WHERE id = estimate_record.id;
    
    -- Update related invoice if exists
    IF estimate_record.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET transaction_number = 'WMH-I-' || base_number 
      WHERE id = estimate_record.invoice_id;
      
      -- Update related delivery if exists
      UPDATE deliveries 
      SET transaction_number = 'WMH-D-' || base_number 
      WHERE invoice_id = estimate_record.invoice_id;
      
      -- Update related payments if exist
      UPDATE payments 
      SET transaction_number = 'WMH-P-' || base_number 
      WHERE invoice_id = estimate_record.invoice_id;
    END IF;
  END LOOP;
  
  -- Handle orphaned invoices (no estimate)
  FOR related_invoice_id IN 
    SELECT id FROM invoices WHERE transaction_number IS NULL
  LOOP
    base_number := generate_base_transaction_number();
    formatted_number := 'WMH-I-' || base_number;
    
    UPDATE invoices 
    SET transaction_number = formatted_number 
    WHERE id = related_invoice_id;
    
    -- Update related delivery and payments
    UPDATE deliveries 
    SET transaction_number = 'WMH-D-' || base_number 
    WHERE invoice_id = related_invoice_id;
    
    UPDATE payments 
    SET transaction_number = 'WMH-P-' || base_number 
    WHERE invoice_id = related_invoice_id;
  END LOOP;
  
  -- Handle remaining orphaned deliveries
  UPDATE deliveries 
  SET transaction_number = generate_formatted_transaction_number('delivery')
  WHERE transaction_number IS NULL;
  
  -- Handle remaining orphaned payments
  UPDATE payments 
  SET transaction_number = generate_formatted_transaction_number('payment')
  WHERE transaction_number IS NULL;
  
  -- Update transactions table with display numbers
  UPDATE transactions 
  SET display_number = generate_formatted_transaction_number('transaction')
  WHERE display_number IS NULL;
END $$;

-- Create triggers to auto-assign transaction numbers for new records
CREATE OR REPLACE FUNCTION auto_assign_transaction_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_number TEXT;
  record_type TEXT;
BEGIN
  -- Determine record type from table name
  CASE TG_TABLE_NAME
    WHEN 'estimates' THEN record_type := 'estimate';
    WHEN 'invoices' THEN record_type := 'invoice';
    WHEN 'deliveries' THEN record_type := 'delivery';
    WHEN 'payments' THEN record_type := 'payment';
    WHEN 'transactions' THEN record_type := 'transaction';
  END CASE;
  
  -- For estimates, always generate new transaction number
  IF TG_TABLE_NAME = 'estimates' THEN
    NEW.transaction_number := generate_formatted_transaction_number('estimate');
  -- For invoices, check if related to estimate
  ELSIF TG_TABLE_NAME = 'invoices' AND NEW.estimate_id IS NOT NULL THEN
    -- Get base number from related estimate
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM estimates WHERE id = NEW.estimate_id;
    NEW.transaction_number := 'WMH-I-' || base_number;
  -- For deliveries, check if related to invoice
  ELSIF TG_TABLE_NAME = 'deliveries' AND NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    NEW.transaction_number := 'WMH-D-' || base_number;
  -- For payments, check if related to invoice
  ELSIF TG_TABLE_NAME = 'payments' AND NEW.invoice_id IS NOT NULL THEN
    SELECT extract_base_transaction_number(transaction_number) INTO base_number
    FROM invoices WHERE id = NEW.invoice_id;
    NEW.transaction_number := 'WMH-P-' || base_number;
  -- For transactions, generate display number
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    NEW.display_number := generate_formatted_transaction_number('transaction');
  -- For orphaned records, generate new transaction number
  ELSE
    IF TG_TABLE_NAME = 'invoices' THEN
      NEW.transaction_number := generate_formatted_transaction_number('invoice');
    ELSIF TG_TABLE_NAME = 'deliveries' THEN
      NEW.transaction_number := generate_formatted_transaction_number('delivery');
    ELSIF TG_TABLE_NAME = 'payments' THEN
      NEW.transaction_number := generate_formatted_transaction_number('payment');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers for all tables
CREATE TRIGGER estimates_transaction_number_trigger
  BEFORE INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER invoices_transaction_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER deliveries_transaction_number_trigger
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER payments_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER transactions_display_number_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();

-- Function to generate consistent customer color
CREATE OR REPLACE FUNCTION public.generate_customer_color(customer_name TEXT)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  colors TEXT[] := ARRAY[
    'hsl(210, 100%, 45%)',  -- Blue
    'hsl(168, 100%, 35%)',  -- Teal
    'hsl(142, 100%, 35%)',  -- Green
    'hsl(45, 100%, 45%)',   -- Yellow
    'hsl(25, 100%, 50%)',   -- Orange
    'hsl(0, 100%, 50%)',    -- Red
    'hsl(280, 100%, 45%)',  -- Purple
    'hsl(320, 100%, 45%)',  -- Pink
    'hsl(200, 100%, 35%)',  -- Light Blue
    'hsl(160, 100%, 40%)'   -- Mint
  ];
  hash_value BIGINT;
  color_index INTEGER;
BEGIN
  -- Generate hash from customer name
  hash_value := abs(hashtext(lower(trim(customer_name))));
  color_index := (hash_value % array_length(colors, 1)) + 1;
  
  RETURN colors[color_index];
END;
$function$;