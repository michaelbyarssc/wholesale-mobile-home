-- RLS Policies for transactions table
CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can delete transactions" ON public.transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_admin_id OR
    is_admin(auth.uid())
  );

CREATE POLICY "Authenticated users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = created_by OR
    user_id IS NULL  -- Allow anonymous transactions
  );

CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_admin_id OR
    is_admin(auth.uid())
  );

-- RLS Policies for transaction_stage_history table
CREATE POLICY "Admins can view all transaction history" ON public.transaction_stage_history
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert transaction history" ON public.transaction_stage_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for transaction_notes table  
CREATE POLICY "Admins can manage all transaction notes" ON public.transaction_notes
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view notes for their transactions" ON public.transaction_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_notes.transaction_id 
      AND (t.user_id = auth.uid() OR t.assigned_admin_id = auth.uid())
    )
    AND (NOT is_internal OR is_admin(auth.uid()))
  );

CREATE POLICY "Users can add notes to their transactions" ON public.transaction_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_notes.transaction_id 
      AND (t.user_id = auth.uid() OR t.assigned_admin_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own notes" ON public.transaction_notes
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_notes.transaction_id 
      AND (t.user_id = auth.uid() OR t.assigned_admin_id = auth.uid())
    )
  );

-- RLS Policies for transaction_payments table
CREATE POLICY "Admins can manage all transaction payments" ON public.transaction_payments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view payments for their transactions" ON public.transaction_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_payments.transaction_id 
      AND (t.user_id = auth.uid() OR t.assigned_admin_id = auth.uid())
    )
  );

-- RLS Policies for transaction_settings table
CREATE POLICY "Admins can manage transaction settings" ON public.transaction_settings
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can modify transaction settings" ON public.transaction_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view transaction settings" ON public.transaction_settings
  FOR SELECT USING (true);

-- RLS Policies for transaction_notifications table
CREATE POLICY "Admins can manage all transaction notifications" ON public.transaction_notifications
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own notifications" ON public.transaction_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications as read" ON public.transaction_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.transaction_notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for transaction tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_stage_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_notifications;

-- Set replica identity for realtime updates
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_stage_history REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_notes REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_payments REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_notifications REPLICA IDENTITY FULL;