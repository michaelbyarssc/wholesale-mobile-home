
-- 1) PAYMENTS: Restrict admins to their assigned users (and allow super admins full access)

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop overly broad admin policy
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Admins: SELECT only payments for invoices whose user_id is in their accessible set; super admins can see all
CREATE POLICY "Admins can view assigned user payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND i.user_id IN (
        SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
      )
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Admins: manage (INSERT/UPDATE/DELETE/SELECT) only payments for invoices whose user_id is in their accessible set; super admins can manage all
CREATE POLICY "Admins can manage assigned user payments"
ON public.payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND i.user_id IN (
        SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
      )
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND i.user_id IN (
        SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
      )
  )
  OR public.has_role(auth.uid(), 'super_admin')
);


-- 2) TRANSACTIONS: Restrict admins to their assigned users (and allow super admins full access)

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop overly broad/overlapping policies we are replacing
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;

-- Users: view only their own transactions or ones explicitly assigned to them as assigned_admin
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = assigned_admin_id
);

-- Users: update only their own transactions or ones explicitly assigned to them as assigned_admin
CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = assigned_admin_id
);

-- Admins: view assigned users' transactions or those where they are assigned_admin; super admins view all
CREATE POLICY "Admins can view assigned user transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
  )
  OR auth.uid() = assigned_admin_id
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Admins: manage assigned users' transactions or those where they are assigned_admin; super admins manage all
CREATE POLICY "Admins can manage assigned user transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
  )
  OR auth.uid() = assigned_admin_id
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  user_id IN (
    SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
  )
  OR auth.uid() = assigned_admin_id
  OR public.has_role(auth.uid(), 'super_admin')
);

-- NOTE: We intentionally did not alter the existing INSERT policy:
-- "Authenticated users can create transactions" (auth.uid() = user_id OR created_by OR user_id IS NULL)
-- and the "Super admins can delete transactions" policy remains in place.
