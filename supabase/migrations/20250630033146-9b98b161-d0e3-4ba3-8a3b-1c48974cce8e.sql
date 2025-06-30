
-- Add retail_price column to mobile_homes table
ALTER TABLE public.mobile_homes 
ADD COLUMN retail_price numeric DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN public.mobile_homes.retail_price IS 'Public retail price displayed to non-authenticated users';
