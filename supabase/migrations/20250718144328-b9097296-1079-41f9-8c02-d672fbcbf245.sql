-- Drop the problematic is_admin function that has no parameters
DROP FUNCTION public.is_admin();

-- Verify the good one still exists
SELECT is_admin() as am_i_admin;