-- Critical Security Fix: Add proper RLS policies to exposed tables

-- 1. Secure anonymous_chat_users table
-- Remove overly permissive policies and add strict access control
DROP POLICY IF EXISTS "Anonymous visitors can view their own anonymous chat user" ON public.anonymous_chat_users;
DROP POLICY IF EXISTS "Insert with valid session" ON public.anonymous_chat_users;
DROP POLICY IF EXISTS "Admins can view assigned anonymous chat users" ON public.anonymous_chat_users;
DROP POLICY IF EXISTS "Super admins can view all anonymous chat users" ON public.anonymous_chat_users;
DROP POLICY IF EXISTS "Admins can update anonymous chat users" ON public.anonymous_chat_users;

CREATE POLICY "Authenticated users can view their chat sessions" ON public.anonymous_chat_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_sessions cs 
    WHERE cs.id = session_id 
    AND (
      (cs.session_token = get_request_header('x-chat-token') AND cs.status = 'active') OR
      cs.agent_id = auth.uid() OR
      is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Allow insert with valid session token" ON public.anonymous_chat_users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions cs 
    WHERE cs.id = session_id 
    AND cs.session_token = get_request_header('x-chat-token')
  )
);

CREATE POLICY "Admins can update chat users" ON public.anonymous_chat_users
FOR UPDATE USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Secure appointments table - remove public access
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

CREATE POLICY "Users can manage their own appointments" ON public.appointments
FOR ALL USING (
  auth.uid() = user_id OR 
  auth.uid() = agent_id OR 
  is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id OR 
  auth.uid() = agent_id OR 
  is_admin(auth.uid())
);

CREATE POLICY "Authenticated users can create appointments" ON public.appointments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Secure deliveries table
CREATE POLICY "Users can view their deliveries" ON public.deliveries
FOR SELECT USING (
  -- Customer can view via tracking token
  EXISTS (
    SELECT 1 FROM customer_tracking_sessions cts
    JOIN orders o ON o.id = cts.order_id
    WHERE o.customer_email = deliveries.customer_email
    AND cts.session_token = get_request_header('x-tracking-token')
    AND cts.active = true
  ) OR
  -- Assigned driver can view
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE da.delivery_id = deliveries.id
    AND dr.user_id = auth.uid()
    AND da.active = true
  ) OR
  -- Admin can view all
  is_admin(auth.uid()) OR
  -- Customer who created estimate/invoice can view
  auth.uid() IN (
    SELECT COALESCE(e.user_id, i.user_id)
    FROM invoices i
    LEFT JOIN estimates e ON e.id = i.estimate_id
    WHERE i.id = deliveries.invoice_id
  )
);

CREATE POLICY "Admins and drivers can update deliveries" ON public.deliveries
FOR UPDATE USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE da.delivery_id = deliveries.id
    AND dr.user_id = auth.uid()
    AND da.active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE da.delivery_id = deliveries.id
    AND dr.user_id = auth.uid()
    AND da.active = true
  )
);

CREATE POLICY "System can create deliveries" ON public.deliveries
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Secure estimates table
CREATE POLICY "Users can view their own estimates" ON public.estimates
FOR SELECT USING (
  auth.uid() = user_id OR
  is_admin(auth.uid())
);

CREATE POLICY "Users can create estimates" ON public.estimates
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their estimates" ON public.estimates
FOR UPDATE USING (
  auth.uid() = user_id OR
  is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id OR
  is_admin(auth.uid())
);

-- 5. Secure invoices table
CREATE POLICY "Users can view their invoices" ON public.invoices
FOR SELECT USING (
  auth.uid() = user_id OR
  is_admin(auth.uid()) OR
  -- Allow access via estimate relationship
  estimate_id IN (
    SELECT id FROM estimates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage invoices" ON public.invoices
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 6. Secure leads table
CREATE POLICY "Users can view assigned leads" ON public.leads
FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() = assigned_to OR
  is_admin(auth.uid())
);

CREATE POLICY "Users can create leads" ON public.leads
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  auth.uid() = assigned_to OR
  is_admin(auth.uid()) OR
  auth.uid() IS NULL -- Allow anonymous lead creation
);

CREATE POLICY "Users can update assigned leads" ON public.leads
FOR UPDATE USING (
  auth.uid() = assigned_to OR
  is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = assigned_to OR
  is_admin(auth.uid())
);

-- 7. Secure orders table
CREATE POLICY "Users can view their orders" ON public.orders
FOR SELECT USING (
  auth.uid() = user_id OR
  is_admin(auth.uid()) OR
  -- Company members can view company orders
  company_id IN (
    SELECT DISTINCT d.company_id
    FROM deliveries d
    JOIN delivery_assignments da ON d.id = da.delivery_id
    JOIN drivers dr ON da.driver_id = dr.id
    WHERE dr.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage orders" ON public.orders
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 8. Secure transactions table
CREATE POLICY "Users can view their transactions" ON public.transactions
FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() = assigned_admin_id OR
  is_admin(auth.uid())
);

CREATE POLICY "Users can create transactions" ON public.transactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  auth.uid() = created_by OR
  is_admin(auth.uid())
);

CREATE POLICY "Admins can update transactions" ON public.transactions
FOR UPDATE USING (
  auth.uid() = assigned_admin_id OR
  is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = assigned_admin_id OR
  is_admin(auth.uid())
);

-- Additional security: Ensure sensitive customer data is properly protected
CREATE POLICY "Protect customer tracking sessions" ON public.customer_tracking_sessions
FOR SELECT USING (
  session_token = get_request_header('x-tracking-token') OR
  is_admin(auth.uid()) OR
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- Secure delivery schedules
CREATE POLICY "Users can view relevant delivery schedules" ON public.delivery_schedules
FOR SELECT USING (
  delivery_id IN (
    SELECT id FROM deliveries 
    WHERE 
      -- Customer access via tracking
      EXISTS (
        SELECT 1 FROM customer_tracking_sessions cts
        JOIN orders o ON o.id = cts.order_id
        WHERE o.customer_email = deliveries.customer_email
        AND cts.session_token = get_request_header('x-tracking-token')
        AND cts.active = true
      ) OR
      -- Driver access
      EXISTS (
        SELECT 1 FROM delivery_assignments da
        JOIN drivers dr ON dr.id = da.driver_id
        WHERE da.delivery_id = deliveries.id
        AND dr.user_id = auth.uid()
        AND da.active = true
      ) OR
      -- Admin access
      is_admin(auth.uid()) OR
      -- Customer who created it
      auth.uid() IN (
        SELECT COALESCE(e.user_id, i.user_id)
        FROM invoices i
        LEFT JOIN estimates e ON e.id = i.estimate_id
        WHERE i.id = deliveries.invoice_id
      )
  )
);

CREATE POLICY "Admins and drivers can update delivery schedules" ON public.delivery_schedules
FOR ALL USING (
  is_admin(auth.uid()) OR
  delivery_id IN (
    SELECT da.delivery_id 
    FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE dr.user_id = auth.uid() AND da.active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR
  delivery_id IN (
    SELECT da.delivery_id 
    FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE dr.user_id = auth.uid() AND da.active = true
  )
);