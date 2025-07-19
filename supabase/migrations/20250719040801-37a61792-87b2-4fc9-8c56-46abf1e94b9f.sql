-- Update existing invoices where balance_due is 0 to set it equal to total_amount
UPDATE public.invoices 
SET balance_due = total_amount 
WHERE balance_due = 0 AND total_amount > 0;