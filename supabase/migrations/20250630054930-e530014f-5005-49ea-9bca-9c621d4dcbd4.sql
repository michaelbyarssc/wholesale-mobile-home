
-- Add single wide and double wide pricing columns to the services table
ALTER TABLE public.services 
ADD COLUMN single_wide_price numeric DEFAULT 0,
ADD COLUMN double_wide_price numeric DEFAULT 0;

-- Update existing services to have default pricing based on current price
UPDATE public.services 
SET single_wide_price = price, 
    double_wide_price = price 
WHERE single_wide_price IS NULL OR double_wide_price IS NULL;

-- Make the new columns non-nullable after setting defaults
ALTER TABLE public.services 
ALTER COLUMN single_wide_price SET NOT NULL,
ALTER COLUMN double_wide_price SET NOT NULL;
