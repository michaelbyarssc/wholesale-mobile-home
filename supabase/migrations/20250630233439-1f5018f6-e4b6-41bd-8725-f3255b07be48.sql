
-- Add the missing selected_home_options column to the estimates table
ALTER TABLE public.estimates 
ADD COLUMN selected_home_options jsonb DEFAULT '[]'::jsonb;
