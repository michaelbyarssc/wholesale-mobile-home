-- Fix RLS policies with table aliases to resolve ambiguous column references

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage orders for their drivers" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Admins can manage payment records" ON public.payment_records;
DROP POLICY IF EXISTS "Admins can manage report templates" ON public.report_templates;
DROP POLICY IF EXISTS "Admins can view analytics for their companies" ON public.delivery_analytics;

-- Recreate policies with proper table aliases
CREATE POLICY "Admins can view their company" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT d.company_id FROM deliveries d
      JOIN delivery_assignments da ON d.id = da.delivery_id
      JOIN drivers dr ON da.driver_id = dr.id
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage orders for their drivers" ON public.orders
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT dr.company_id FROM drivers dr
      WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT dr.company_id FROM drivers dr WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage payment records" ON public.payment_records
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.company_id IN (
        SELECT DISTINCT dr.company_id FROM drivers dr WHERE dr.created_by = auth.uid()
      )
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage report templates" ON public.report_templates
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT dr.company_id FROM drivers dr WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view analytics for their companies" ON public.delivery_analytics
  FOR SELECT USING (
    company_id IN (
      SELECT DISTINCT dr.company_id FROM drivers dr WHERE dr.created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );