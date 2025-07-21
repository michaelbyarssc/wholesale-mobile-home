-- Fix the invoice transaction number to match the estimate's base number
UPDATE invoices 
SET transaction_number = 'WMH-I-001111' 
WHERE transaction_number = 'WMH-I-001114';