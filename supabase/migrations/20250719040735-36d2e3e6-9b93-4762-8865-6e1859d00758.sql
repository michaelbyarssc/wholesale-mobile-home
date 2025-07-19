-- Remove the default value from balance_due column that was causing it to always be 0
ALTER TABLE public.invoices ALTER COLUMN balance_due DROP DEFAULT;