-- Check and fix any triggers on payments table that reference estimate_id
-- First, let's see what triggers exist
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'payments';

-- Drop any problematic triggers that reference estimate_id
-- This is likely an old trigger that's causing the issue
DROP TRIGGER IF EXISTS update_transaction_balance_trigger ON payments;
DROP TRIGGER IF EXISTS update_invoice_balance_trigger ON payments;