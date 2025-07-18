-- Fix the RLS policy on payment_records table that references non-existent order_id
-- First, let's drop the existing problematic policy and create a correct one

-- Drop the existing policy on payment_records
DROP POLICY IF EXISTS "Admins can manage payment records" ON payment_records;

-- Create a correct policy for payment_records that doesn't reference order_id
CREATE POLICY "Admins can manage payment records" 
ON payment_records 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);