-- Drop the update_transaction_balance function that's causing the issue
DROP FUNCTION IF EXISTS public.update_transaction_balance();

-- Also check and remove any other functions that might reference estimate_id in payments context
DROP FUNCTION IF EXISTS public.update_transaction_balance_trigger();
DROP FUNCTION IF EXISTS public.update_invoice_balance();
DROP FUNCTION IF EXISTS public.log_payment_changes();