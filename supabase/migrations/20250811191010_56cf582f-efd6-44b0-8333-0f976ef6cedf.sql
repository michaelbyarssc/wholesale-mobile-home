
-- Ensure RLS is enabled
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 1) Remove overly broad admin policy
DROP POLICY IF EXISTS "Admins manage deliveries" ON public.deliveries;

-- 2) Replace admin policies so they include both invoice->estimate and direct estimate links

-- Drop existing admin policies to avoid overlapping logic
DROP POLICY IF EXISTS "Admins can view assigned user deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can manage assigned user deliveries" ON public.deliveries;

-- Admins: SELECT deliveries where estimate.user_id is in get_admin_accessible_users(admin)
-- Also allow super admins explicitly (though a separate super admin policy already exists)
CREATE POLICY "Admins can view assigned user deliveries"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    -- via direct estimate reference
    EXISTS (
      SELECT 1
      FROM public.estimates e
      WHERE e.id = deliveries.estimate_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR
    -- via invoice -> estimate linkage
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.estimates e ON e.id = i.estimate_id
      WHERE i.id = deliveries.invoice_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Admins: manage (INSERT/UPDATE/DELETE/SELECT) deliveries, but only for assigned users or super admin
CREATE POLICY "Admins can manage assigned user deliveries"
  ON public.deliveries
  FOR ALL
  TO authenticated
  USING (
    -- via direct estimate reference
    EXISTS (
      SELECT 1
      FROM public.estimates e
      WHERE e.id = deliveries.estimate_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR
    -- via invoice -> estimate linkage
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.estimates e ON e.id = i.estimate_id
      WHERE i.id = deliveries.invoice_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    -- same conditions for data being written
    EXISTS (
      SELECT 1
      FROM public.estimates e
      WHERE e.id = deliveries.estimate_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.estimates e ON e.id = i.estimate_id
      WHERE i.id = deliveries.invoice_id
        AND e.user_id IN (
          SELECT user_id FROM public.get_admin_accessible_users(auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 3) Allow regular users to view their own deliveries (via estimate/invoice linkage)
CREATE POLICY "Users can view own deliveries via estimate/invoice"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    -- via direct estimate reference
    EXISTS (
      SELECT 1
      FROM public.estimates e
      WHERE e.id = deliveries.estimate_id
        AND e.user_id = auth.uid()
    )
    OR
    -- via invoice -> estimate linkage
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.estimates e ON e.id = i.estimate_id
      WHERE i.id = deliveries.invoice_id
        AND e.user_id = auth.uid()
    )
  );

-- NOTE:
-- Existing driver policies and "Super admins can view all deliveries" remain untouched.
-- This achieves:
-- - Admins: only deliveries for users returned by get_admin_accessible_users(auth.uid()) (includes themselves)
-- - Drivers: only their assigned deliveries (already enforced by existing policies)
-- - Users: only their own deliveries via estimate/invoice
-- - Super admins: can still see all deliveries
