-- Update existing invoice payment handling to work with transactions
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  related_transaction_id UUID;
BEGIN
  -- Find related transaction
  SELECT id INTO related_transaction_id
  FROM transactions
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  LIMIT 1;
  
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
    
    -- Update related transaction if exists
    IF related_transaction_id IS NOT NULL THEN
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
      WHERE id = related_transaction_id;
    END IF;
    
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
    
    -- Update related transaction if exists
    IF related_transaction_id IS NOT NULL THEN
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
      WHERE id = related_transaction_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create function to migrate existing estimates/invoices to transactions
CREATE OR REPLACE FUNCTION public.migrate_existing_estimates_to_transactions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  estimate_record RECORD;
  invoice_record RECORD;
  new_transaction_id UUID;
  migrated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Migrate approved estimates that don't have transactions yet
  FOR estimate_record IN 
    SELECT DISTINCT e.* 
    FROM estimates e
    LEFT JOIN transactions t ON t.estimate_id = e.id
    WHERE e.approved_at IS NOT NULL 
    AND t.id IS NULL
  LOOP
    BEGIN
      -- Create transaction for this estimate
      SELECT create_transaction_from_estimate(
        estimate_record.id,
        estimate_record.mobile_home_id,
        estimate_record.customer_name,
        estimate_record.customer_email,
        estimate_record.customer_phone,
        estimate_record.delivery_address,
        estimate_record.selected_services,
        estimate_record.selected_home_options,
        0, -- base_amount
        0, -- service_amount
        0, -- tax_amount
        estimate_record.total_amount,
        estimate_record.preferred_contact,
        estimate_record.timeline,
        estimate_record.additional_requirements,
        'sale'::transaction_type
      ) INTO new_transaction_id;
      
      -- Set appropriate status based on estimate state
      UPDATE transactions 
      SET 
        status = CASE 
          WHEN estimate_record.invoice_id IS NOT NULL THEN 'invoice_generated'::transaction_status
          ELSE 'estimate_approved'::transaction_status
        END,
        invoice_id = estimate_record.invoice_id,
        created_at = estimate_record.created_at,
        updated_at = estimate_record.updated_at
      WHERE id = new_transaction_id;
      
      -- Update invoice reference if exists
      IF estimate_record.invoice_id IS NOT NULL THEN
        UPDATE invoices 
        SET estimate_id = estimate_record.id
        WHERE id = estimate_record.invoice_id;
      END IF;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION 
      WHEN OTHERS THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
    END;
  END LOOP;
  
  -- Migrate standalone invoices that don't have transactions yet
  FOR invoice_record IN 
    SELECT DISTINCT i.* 
    FROM invoices i
    LEFT JOIN transactions t ON t.invoice_id = i.id
    WHERE t.id IS NULL
  LOOP
    BEGIN
      -- Create transaction for this invoice
      INSERT INTO transactions (
        transaction_type,
        status,
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        mobile_home_id,
        selected_services,
        selected_home_options,
        base_amount,
        service_amount,
        tax_amount,
        total_amount,
        paid_amount,
        balance_due,
        user_id,
        created_by,
        invoice_id,
        preferred_contact,
        timeline,
        additional_requirements,
        created_at,
        updated_at
      ) VALUES (
        'sale'::transaction_type,
        CASE 
          WHEN invoice_record.status = 'paid' THEN 'payment_complete'::transaction_status
          WHEN invoice_record.balance_due < invoice_record.total_amount THEN 'payment_partial'::transaction_status
          ELSE 'invoice_generated'::transaction_status
        END,
        invoice_record.customer_name,
        invoice_record.customer_email,
        invoice_record.customer_phone,
        invoice_record.delivery_address,
        invoice_record.mobile_home_id,
        invoice_record.selected_services,
        invoice_record.selected_home_options,
        0, -- base_amount
        0, -- service_amount
        0, -- tax_amount
        invoice_record.total_amount,
        invoice_record.total_amount - COALESCE(invoice_record.balance_due, invoice_record.total_amount),
        COALESCE(invoice_record.balance_due, invoice_record.total_amount),
        invoice_record.user_id,
        invoice_record.user_id,
        invoice_record.id,
        invoice_record.preferred_contact,
        invoice_record.timeline,
        invoice_record.additional_requirements,
        invoice_record.created_at,
        invoice_record.updated_at
      ) RETURNING id INTO new_transaction_id;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION 
      WHEN OTHERS THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'migrated_count', migrated_count,
    'skipped_count', skipped_count,
    'message', 'Migration completed successfully'
  );
END;
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role IN ('admin', 'super_admin')
  )
$$;