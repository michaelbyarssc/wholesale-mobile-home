
-- Add minimum profit column to mobile_homes table
ALTER TABLE public.mobile_homes 
ADD COLUMN IF NOT EXISTS minimum_profit numeric DEFAULT 0;

-- Update the column to be NOT NULL with a default value
ALTER TABLE public.mobile_homes 
ALTER COLUMN minimum_profit SET NOT NULL;
