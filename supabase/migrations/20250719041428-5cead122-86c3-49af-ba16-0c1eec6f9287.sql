-- Update all existing invoices where balance_due is NULL to set it equal to total_amount
UPDATE public.invoices 
SET balance_due = total_amount 
WHERE balance_due IS NULL AND total_amount > 0;