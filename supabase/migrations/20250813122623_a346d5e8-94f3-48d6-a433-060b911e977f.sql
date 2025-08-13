-- Critical Security Fix: Add proper RLS policies to exposed tables
-- First drop all existing policies to avoid conflicts

-- Drop existing policies on estimates
DROP POLICY IF EXISTS "Users can view their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can create estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can update their estimates" ON public.estimates;
DROP POLICY IF EXISTS "Admins can manage estimates" ON public.estimates;

-- Drop existing policies on invoices  
DROP POLICY IF EXISTS "Users can view their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;

-- Drop existing policies on leads
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;

-- Drop existing policies on orders
DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

-- Drop existing policies on transactions
DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;

-- Drop existing policies on deliveries
DROP POLICY IF EXISTS "Users can view their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins and drivers can update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "System can create deliveries" ON public.deliveries;

-- Drop existing policies on delivery_schedules
DROP POLICY IF EXISTS "Users can view relevant delivery schedules" ON public.delivery_schedules;
DROP POLICY IF EXISTS "Admins and drivers can update delivery schedules" ON public.delivery_schedules;

-- Drop existing policies on customer_tracking_sessions
DROP POLICY IF EXISTS "Protect customer tracking sessions" ON public.customer_tracking_sessions;

-- Now create secure policies

-- 1. Secure estimates table
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

-- 2. Secure invoices table
CREATE POLICY "Users can view their invoices" ON public.invoices
FOR SELECT USING (
  auth.uid() = user_id OR
  is_admin(auth.uid()) OR
  estimate_id IN (
    SELECT id FROM estimates WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage invoices" ON public.invoices
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3. Secure leads table
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
  auth.uid() IS NULL
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

-- 4. Secure orders table
CREATE POLICY "Users can view their orders" ON public.orders
FOR SELECT USING (
  auth.uid() = user_id OR
  is_admin(auth.uid()) OR
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

-- 5. Secure transactions table
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

-- 6. Secure deliveries table
CREATE POLICY "Users can view their deliveries" ON public.deliveries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customer_tracking_sessions cts
    JOIN orders o ON o.id = cts.order_id
    WHERE o.customer_email = deliveries.customer_email
    AND cts.session_token = get_request_header('x-tracking-token')
    AND cts.active = true
  ) OR
  EXISTS (
    SELECT 1 FROM delivery_assignments da
    JOIN drivers dr ON dr.id = da.driver_id
    WHERE da.delivery_id = deliveries.id
    AND dr.user_id = auth.uid()
    AND da.active = true
  ) OR
  is_admin(auth.uid()) OR
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

-- 7. Secure delivery schedules
CREATE POLICY "Users can view relevant delivery schedules" ON public.delivery_schedules
FOR SELECT USING (
  delivery_id IN (
    SELECT id FROM deliveries 
    WHERE 
      EXISTS (
        SELECT 1 FROM customer_tracking_sessions cts
        JOIN orders o ON o.id = cts.order_id
        WHERE o.customer_email = deliveries.customer_email
        AND cts.session_token = get_request_header('x-tracking-token')
        AND cts.active = true
      ) OR
      EXISTS (
        SELECT 1 FROM delivery_assignments da
        JOIN drivers dr ON dr.id = da.driver_id
        WHERE da.delivery_id = deliveries.id
        AND dr.user_id = auth.uid()
        AND da.active = true
      ) OR
      is_admin(auth.uid()) OR
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

-- 8. Secure customer tracking sessions
CREATE POLICY "Protect customer tracking sessions" ON public.customer_tracking_sessions
FOR SELECT USING (
  session_token = get_request_header('x-tracking-token') OR
  is_admin(auth.uid()) OR
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);