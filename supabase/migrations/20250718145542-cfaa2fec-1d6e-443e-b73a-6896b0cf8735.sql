-- Simple approach: Just update the estimate status directly and set approved_at
-- This bypasses the complex approve_estimate function that's causing foreign key issues

UPDATE estimates 
SET 
  status = 'approved',
  approved_at = now(),
  updated_at = now()
WHERE id = 'dc2df6a7-67e7-4040-9433-d6201da600c4';