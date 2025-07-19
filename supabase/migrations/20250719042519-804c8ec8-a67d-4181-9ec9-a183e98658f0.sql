-- Drop the old record_invoice_payment function that has p_payment_reference parameter
DROP FUNCTION IF EXISTS public.record_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT);

-- Keep only our new function with the correct parameters
-- The function we created should still be there with these parameters:
-- (p_invoice_id UUID, p_amount NUMERIC, p_payment_method TEXT, p_notes TEXT)