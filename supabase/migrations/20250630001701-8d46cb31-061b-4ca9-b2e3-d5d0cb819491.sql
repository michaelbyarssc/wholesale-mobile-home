
-- Add minimum profit per home column to customer_markups table
ALTER TABLE public.customer_markups 
ADD COLUMN minimum_profit_per_home numeric DEFAULT 0;

-- Update the column to be NOT NULL with a default value
ALTER TABLE public.customer_markups 
ALTER COLUMN minimum_profit_per_home SET NOT NULL;
