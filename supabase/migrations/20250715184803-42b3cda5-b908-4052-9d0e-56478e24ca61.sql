-- Function to create transaction from estimate (modernized approach)
CREATE OR REPLACE FUNCTION public.create_transaction_from_estimate(
  p_estimate_id uuid,
  p_mobile_home_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_selected_services uuid[] DEFAULT '{}',
  p_selected_home_options jsonb DEFAULT '[]',
  p_base_amount numeric DEFAULT 0,
  p_service_amount numeric DEFAULT 0,
  p_tax_amount numeric DEFAULT 0,
  p_total_amount numeric DEFAULT 0,
  p_preferred_contact text DEFAULT NULL,
  p_timeline text DEFAULT NULL,
  p_additional_requirements text DEFAULT NULL,
  p_transaction_type transaction_type DEFAULT 'sale'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id uuid;
  estimate_settings jsonb;
  estimate_expiry_days integer;
  assigned_admin uuid;
BEGIN
  -- Get estimate expiry settings
  SELECT setting_value INTO estimate_settings 
  FROM transaction_settings 
  WHERE setting_key = 'estimate_expiry_days';
  
  estimate_expiry_days := COALESCE((estimate_settings)::integer, 7);
  
  -- Auto-assign admin if enabled
  SELECT setting_value INTO estimate_settings 
  FROM transaction_settings 
  WHERE setting_key = 'auto_assign_admins';
  
  IF (estimate_settings)::boolean THEN
    SELECT ur.user_id INTO assigned_admin
    FROM user_roles ur
    LEFT JOIN (
      SELECT assigned_admin_id, COUNT(*) as workload
      FROM transactions 
      WHERE status NOT IN ('completed', 'cancelled')
      GROUP BY assigned_admin_id
    ) workload ON ur.user_id = workload.assigned_admin_id
    WHERE ur.role IN ('admin', 'super_admin')
    ORDER BY COALESCE(workload.workload, 0) ASC, RANDOM()
    LIMIT 1;
  END IF;
  
  -- Create transaction
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
    balance_due,
    user_id,
    assigned_admin_id,
    created_by,
    estimate_expires_at,
    preferred_contact,
    timeline,
    additional_requirements,
    estimate_id
  ) VALUES (
    p_transaction_type,
    'estimate_submitted',
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_delivery_address,
    p_mobile_home_id,
    p_selected_services,
    p_selected_home_options,
    p_base_amount,
    p_service_amount,
    p_tax_amount,
    p_total_amount,
    p_total_amount, -- Initial balance equals total
    auth.uid(),
    assigned_admin,
    auth.uid(),
    now() + (estimate_expiry_days || ' days')::interval,
    p_preferred_contact,
    p_timeline,
    p_additional_requirements,
    p_estimate_id
  ) RETURNING id INTO new_transaction_id;
  
  -- Create notification for admin
  IF assigned_admin IS NOT NULL THEN
    INSERT INTO transaction_notifications (
      transaction_id,
      user_id,
      notification_type,
      title,
      message,
      metadata
    ) VALUES (
      new_transaction_id,
      assigned_admin,
      'estimate_submitted',
      'New Estimate Submitted',
      'A new estimate has been submitted by ' || p_customer_name || ' and requires your review.',
      jsonb_build_object('customer_email', p_customer_email, 'amount', p_total_amount)
    );
  END IF;
  
  RETURN new_transaction_id;
END;
$function$;

-- Function to approve transaction (replaces approve_estimate)
CREATE OR REPLACE FUNCTION public.approve_transaction(
  p_transaction_id uuid,
  p_approved_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record transactions%ROWTYPE;
  invoice_settings jsonb;
  invoice_expiry_days integer;
  result jsonb;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF transaction_record.status != 'estimate_submitted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction cannot be approved from current status');
  END IF;
  
  -- Get invoice expiry settings
  SELECT setting_value INTO invoice_settings 
  FROM transaction_settings 
  WHERE setting_key = 'invoice_expiry_days';
  
  invoice_expiry_days := COALESCE((invoice_settings)::integer, 14);
  
  -- Update transaction status and set invoice expiry
  UPDATE transactions 
  SET 
    status = 'invoice_generated',
    invoice_expires_at = now() + (invoice_expiry_days || ' days')::interval,
    updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Create notification for customer
  INSERT INTO transaction_notifications (
    transaction_id,
    user_id,
    notification_type,
    title,
    message,
    metadata
  ) VALUES (
    p_transaction_id,
    transaction_record.user_id,
    'estimate_approved',
    'Estimate Approved',
    'Your estimate ' || transaction_record.transaction_number || ' has been approved and converted to an invoice.',
    jsonb_build_object('invoice_expires_at', now() + (invoice_expiry_days || ' days')::interval)
  );
  
  result := jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'transaction_number', transaction_record.transaction_number,
    'invoice_expires_at', now() + (invoice_expiry_days || ' days')::interval
  );
  
  RETURN result;
END;
$function$;

-- Function to handle transaction stage transitions
CREATE OR REPLACE FUNCTION public.transition_transaction_stage(
  p_transaction_id uuid,
  p_new_status transaction_status,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record transactions%ROWTYPE;
  valid_transition boolean := false;
  result jsonb;
BEGIN
  -- Get current transaction
  SELECT * INTO transaction_record
  FROM transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Validate transition logic
  CASE transaction_record.status
    WHEN 'draft' THEN
      valid_transition := p_new_status IN ('estimate_submitted', 'cancelled');
    WHEN 'estimate_submitted' THEN
      valid_transition := p_new_status IN ('estimate_approved', 'cancelled', 'expired');
    WHEN 'estimate_approved' THEN
      valid_transition := p_new_status IN ('invoice_generated', 'cancelled');
    WHEN 'invoice_generated' THEN
      valid_transition := p_new_status IN ('payment_partial', 'payment_complete', 'cancelled', 'expired');
    WHEN 'payment_partial' THEN
      valid_transition := p_new_status IN ('payment_complete', 'cancelled');
    WHEN 'payment_complete' THEN
      valid_transition := p_new_status IN ('delivery_scheduled', 'completed');
    WHEN 'delivery_scheduled' THEN
      valid_transition := p_new_status IN ('delivery_in_progress', 'cancelled');
    WHEN 'delivery_in_progress' THEN
      valid_transition := p_new_status IN ('delivery_complete', 'cancelled');
    WHEN 'delivery_complete' THEN
      valid_transition := p_new_status IN ('completed');
    ELSE
      valid_transition := false;
  END CASE;
  
  IF NOT valid_transition THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid transition from ' || transaction_record.status || ' to ' || p_new_status
    );
  END IF;
  
  -- Update transaction status
  UPDATE transactions 
  SET 
    status = p_new_status,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Create notification based on new status
  CASE p_new_status
    WHEN 'estimate_approved' THEN
      INSERT INTO transaction_notifications (
        transaction_id, user_id, notification_type, title, message
      ) VALUES (
        p_transaction_id, transaction_record.user_id, 'estimate_approved',
        'Estimate Approved', 'Your estimate has been approved and converted to an invoice.'
      );
    WHEN 'payment_complete' THEN
      INSERT INTO transaction_notifications (
        transaction_id, user_id, notification_type, title, message
      ) VALUES (
        p_transaction_id, transaction_record.user_id, 'payment_complete',
        'Payment Complete', 'Your payment has been received and processed.'
      );
    WHEN 'delivery_complete' THEN
      INSERT INTO transaction_notifications (
        transaction_id, user_id, notification_type, title, message
      ) VALUES (
        p_transaction_id, transaction_record.user_id, 'delivery_complete',
        'Delivery Complete', 'Your order has been delivered successfully.'
      );
    WHEN 'completed' THEN
      INSERT INTO transaction_notifications (
        transaction_id, user_id, notification_type, title, message
      ) VALUES (
        p_transaction_id, transaction_record.user_id, 'transaction_complete',
        'Transaction Complete', 'Your transaction has been completed successfully.'
      );
    ELSE
      -- No notification needed for other statuses
      NULL;
  END CASE;
  
  result := jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'old_status', transaction_record.status,
    'new_status', p_new_status,
    'transaction_number', transaction_record.transaction_number
  );
  
  RETURN result;
END;
$function$;

-- Function to add payment to transaction
CREATE OR REPLACE FUNCTION public.add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record transactions%ROWTYPE;
  payment_id uuid;
  result jsonb;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Insert payment record
  INSERT INTO transaction_payments (
    transaction_id,
    amount,
    payment_method,
    payment_reference,
    recorded_by,
    notes
  ) VALUES (
    p_transaction_id,
    p_amount,
    p_payment_method,
    p_payment_reference,
    auth.uid(),
    p_notes
  ) RETURNING id INTO payment_id;
  
  result := jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'transaction_id', p_transaction_id,
    'amount', p_amount,
    'new_balance', transaction_record.total_amount - (transaction_record.paid_amount + p_amount)
  );
  
  RETURN result;
END;
$function$;

-- Function to check and expire transactions
CREATE OR REPLACE FUNCTION public.check_expired_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_count integer := 0;
  transaction_record record;
BEGIN
  -- Check for expired estimates
  FOR transaction_record IN 
    SELECT id, transaction_number, user_id, customer_name
    FROM transactions 
    WHERE status = 'estimate_submitted' 
    AND estimate_expires_at < now()
  LOOP
    -- Update status to expired
    UPDATE transactions 
    SET status = 'expired', updated_at = now()
    WHERE id = transaction_record.id;
    
    -- Create notification
    INSERT INTO transaction_notifications (
      transaction_id,
      user_id,
      notification_type,
      title,
      message
    ) VALUES (
      transaction_record.id,
      transaction_record.user_id,
      'estimate_expired',
      'Estimate Expired',
      'Your estimate ' || transaction_record.transaction_number || ' has expired. Please contact us to renew.'
    );
    
    expired_count := expired_count + 1;
  END LOOP;
  
  -- Check for expired invoices
  FOR transaction_record IN 
    SELECT id, transaction_number, user_id, customer_name
    FROM transactions 
    WHERE status = 'invoice_generated' 
    AND invoice_expires_at < now()
  LOOP
    -- Update status to expired
    UPDATE transactions 
    SET status = 'expired', updated_at = now()
    WHERE id = transaction_record.id;
    
    -- Create notification
    INSERT INTO transaction_notifications (
      transaction_id,
      user_id,
      notification_type,
      title,
      message
    ) VALUES (
      transaction_record.id,
      transaction_record.user_id,
      'invoice_expired',
      'Invoice Expired',
      'Your invoice ' || transaction_record.transaction_number || ' has expired. Please contact us to renew.'
    );
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$function$;

-- Function for bulk admin operations
CREATE OR REPLACE FUNCTION public.bulk_approve_transactions(
  p_transaction_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  success_count integer := 0;
  error_count integer := 0;
  transaction_id uuid;
  approval_result jsonb;
  results jsonb[] := '{}';
BEGIN
  FOREACH transaction_id IN ARRAY p_transaction_ids
  LOOP
    SELECT approve_transaction(transaction_id) INTO approval_result;
    
    IF (approval_result->>'success')::boolean THEN
      success_count := success_count + 1;
    ELSE
      error_count := error_count + 1;
    END IF;
    
    results := array_append(results, approval_result);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'results', results
  );
END;
$function$;

-- Function to get transaction dashboard data
CREATE OR REPLACE FUNCTION public.get_transaction_dashboard_data(
  p_user_id uuid DEFAULT NULL,
  p_date_range_days integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_filter uuid;
  date_filter timestamp with time zone;
  dashboard_data jsonb;
  status_counts jsonb;
  total_revenue numeric;
  pending_amount numeric;
  avg_transaction_value numeric;
  transaction_count integer;
BEGIN
  user_filter := COALESCE(p_user_id, auth.uid());
  date_filter := now() - (p_date_range_days || ' days')::interval;
  
  -- Get status counts
  SELECT jsonb_object_agg(status, count) INTO status_counts
  FROM (
    SELECT status, COUNT(*) as count
    FROM transactions
    WHERE (user_id = user_filter OR is_admin(auth.uid()))
    AND created_at >= date_filter
    GROUP BY status
  ) status_summary;
  
  -- Get financial metrics
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('estimate_submitted', 'invoice_generated', 'payment_partial') THEN balance_due ELSE 0 END), 0),
    COALESCE(AVG(total_amount), 0),
    COUNT(*)
  INTO total_revenue, pending_amount, avg_transaction_value, transaction_count
  FROM transactions
  WHERE (user_id = user_filter OR is_admin(auth.uid()))
  AND created_at >= date_filter;
  
  dashboard_data := jsonb_build_object(
    'status_counts', COALESCE(status_counts, '{}'),
    'total_revenue', total_revenue,
    'pending_amount', pending_amount,
    'avg_transaction_value', avg_transaction_value,
    'transaction_count', transaction_count,
    'date_range_days', p_date_range_days
  );
  
  RETURN dashboard_data;
END;
$function$;