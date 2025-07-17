-- Completely remove transaction number generation for payments to test if that's the issue
DROP TRIGGER IF EXISTS payments_transaction_number_trigger ON payments;

-- Let's also check if there are any other functions that might be causing this
-- For now, let's try payments without auto-generating transaction numbers