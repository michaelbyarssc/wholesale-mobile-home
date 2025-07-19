-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS trigger_transaction_balance_update ON transaction_payments;
DROP TRIGGER IF EXISTS update_transaction_balance_trigger ON transaction_payments;

-- Now drop the function
DROP FUNCTION IF EXISTS public.update_transaction_balance() CASCADE;

-- Also check if there are any other triggers on payments table that might be causing issues
DROP TRIGGER IF EXISTS payments_update_transaction_balance ON payments;
DROP TRIGGER IF EXISTS update_payments_balance ON payments;