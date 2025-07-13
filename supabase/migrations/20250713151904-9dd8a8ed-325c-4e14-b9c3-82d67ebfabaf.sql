-- Check if admin policies exist for deliveries table and add if needed
DO $$
BEGIN
  -- Add admin policy for deliveries if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'deliveries' 
    AND policyname = 'Admins can manage all deliveries'
  ) THEN
    CREATE POLICY "Admins can manage all deliveries" 
    ON public.deliveries 
    FOR ALL 
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Now update the delivery status to in_transit
UPDATE public.deliveries 
SET status = 'in_transit'::delivery_status,
    updated_at = now()
WHERE delivery_number = 'DEL-001000';