-- Remove all auto assign transaction number triggers from payments table
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON payments;
DROP TRIGGER IF EXISTS payments_transaction_number_trigger ON payments;

-- The function is still looking for estimate_id somewhere. Let's check the function that updates invoice balance
-- and make sure it's not causing the issue

-- Check and potentially fix the update_invoice_balance trigger function
DROP FUNCTION IF EXISTS public.update_invoice_balance CASCADE;

-- Now recreate just the transaction number trigger with the corrected function
CREATE TRIGGER payments_transaction_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_transaction_number();