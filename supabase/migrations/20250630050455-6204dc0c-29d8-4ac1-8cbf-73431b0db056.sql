
-- Add new columns to support per-square-foot pricing
ALTER TABLE public.home_options 
ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN price_per_sqft NUMERIC DEFAULT 0;

-- Add a check constraint to ensure valid pricing types
ALTER TABLE public.home_options 
ADD CONSTRAINT check_pricing_type 
CHECK (pricing_type IN ('fixed', 'per_sqft'));

-- Update the calculated_price column to be nullable since it will be calculated dynamically for per_sqft options
ALTER TABLE public.home_options 
ALTER COLUMN calculated_price DROP NOT NULL;

-- Add a comment to explain the pricing types
COMMENT ON COLUMN public.home_options.pricing_type IS 'Type of pricing: fixed (uses cost_price + markup) or per_sqft (uses price_per_sqft * home square footage)';
COMMENT ON COLUMN public.home_options.price_per_sqft IS 'Price per square foot when pricing_type is per_sqft';
