-- Fix the existing delivery transaction number to be WMH-D-001110
UPDATE deliveries 
SET transaction_number = 'WMH-D-001110' 
WHERE transaction_number = 'WMH-D-001109';