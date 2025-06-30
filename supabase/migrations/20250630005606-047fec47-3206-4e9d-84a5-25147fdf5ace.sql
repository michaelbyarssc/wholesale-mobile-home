
-- Add display_order column to mobile_homes table for drag and drop ordering
ALTER TABLE public.mobile_homes 
ADD COLUMN display_order integer DEFAULT 0;

-- Set initial display_order values using a subquery approach
WITH ordered_homes AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as order_num
  FROM public.mobile_homes
)
UPDATE public.mobile_homes 
SET display_order = ordered_homes.order_num
FROM ordered_homes
WHERE public.mobile_homes.id = ordered_homes.id;

-- Make display_order NOT NULL
ALTER TABLE public.mobile_homes 
ALTER COLUMN display_order SET NOT NULL;
