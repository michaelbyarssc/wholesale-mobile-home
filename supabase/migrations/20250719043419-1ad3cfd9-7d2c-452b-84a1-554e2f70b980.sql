-- Check all triggers on payments table
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'payments';

-- Also check for any triggers that might reference estimate_id
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%estimate_id%';

-- Drop ALL triggers on payments table to resolve the issue
DROP TRIGGER IF EXISTS update_transaction_balance ON payments;
DROP TRIGGER IF EXISTS log_payment_transaction ON payments;
DROP TRIGGER IF EXISTS update_invoice_from_payment ON payments;
DROP TRIGGER IF EXISTS payment_audit_trigger ON payments;

-- Check if there are any other triggers
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'payments';