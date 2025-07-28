-- Add corrected RLS policies for tables that have RLS enabled but no policies

-- Delivery pieces - admin only access
CREATE POLICY "Admins can manage delivery pieces" 
ON public.delivery_pieces 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- GPS tracking offline - drivers and admins
CREATE POLICY "Drivers can manage their GPS tracking" 
ON public.gps_tracking_offline 
FOR ALL 
USING (
  auth.uid() = driver_id OR is_admin(auth.uid())
) 
WITH CHECK (
  auth.uid() = driver_id OR is_admin(auth.uid())
);

-- Factory templates - admin only
CREATE POLICY "Admins can manage factory templates" 
ON public.factory_templates 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Factory email parsing - admin only
CREATE POLICY "Admins can manage factory email parsing" 
ON public.factory_email_parsing 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Factory communications - admin only
CREATE POLICY "Admins can manage factory communications" 
ON public.factory_communications 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Delivery checklists - admin only
CREATE POLICY "Admins can manage delivery checklists" 
ON public.delivery_checklists 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Delivery checklist completions - drivers and admins
CREATE POLICY "Drivers can manage checklist completions" 
ON public.delivery_checklist_completions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.user_id = auth.uid() 
    AND d.id = delivery_checklist_completions.driver_id
  ) OR is_admin(auth.uid())
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.user_id = auth.uid() 
    AND d.id = delivery_checklist_completions.driver_id
  ) OR is_admin(auth.uid())
);

-- Repair requests - users can view their own, admins can manage all
CREATE POLICY "Users can view their repair requests" 
ON public.repair_requests 
FOR SELECT 
USING (auth.uid() = reported_by OR is_admin(auth.uid()));

CREATE POLICY "Users can create repair requests" 
ON public.repair_requests 
FOR INSERT 
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can manage all repair requests" 
ON public.repair_requests 
FOR ALL 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

-- Notification logs - system access only
CREATE POLICY "System can manage notification logs" 
ON public.notification_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);