-- Update existing transaction numbers to follow the new format
-- This will convert WMH-001043 to WMH-E-001043, etc.

-- Update estimates: WMH-XXXXXX -> WMH-E-XXXXXX
UPDATE estimates 
SET transaction_number = 'WMH-E-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$';

-- Update invoices: WMH-XXXXXX -> WMH-I-XXXXXX
UPDATE invoices 
SET transaction_number = 'WMH-I-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$';

-- Update deliveries: WMH-XXXXXX -> WMH-D-XXXXXX
UPDATE deliveries 
SET transaction_number = 'WMH-D-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$';

-- Update payments: WMH-XXXXXX -> WMH-P-XXXXXX
UPDATE payments 
SET transaction_number = 'WMH-P-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$';

-- Update transactions based on their type
-- For repair transactions
UPDATE transactions 
SET transaction_number = 'WMH-R-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$' 
AND transaction_type = 'repair';

-- For other transactions (sale, etc.)
UPDATE transactions 
SET transaction_number = 'WMH-T-' || SUBSTRING(transaction_number FROM 5)
WHERE transaction_number ~ '^WMH-[0-9]+$' 
AND transaction_type != 'repair';