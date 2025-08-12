-- Fix get_public_services to only include existing columns
CREATE OR REPLACE FUNCTION public.get_public_services()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  active boolean,
  price numeric,
  single_wide_price numeric,
  double_wide_price numeric,
  dependencies uuid[],
  applicable_manufacturers text[],
  applicable_series text[]
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    s.id,
    s.name,
    s.description,
    s.active,
    s.price,
    s.single_wide_price,
    s.double_wide_price,
    s.dependencies,
    s.applicable_manufacturers,
    s.applicable_series
  FROM public.services s
  WHERE s.active = true
  ORDER BY s.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_services() TO anon, authenticated;
