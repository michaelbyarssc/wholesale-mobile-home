-- Adjust column types to match table (jsonb arrays)
CREATE OR REPLACE FUNCTION public.get_public_services()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  active boolean,
  price numeric,
  single_wide_price numeric,
  double_wide_price numeric,
  dependencies jsonb,
  applicable_manufacturers jsonb,
  applicable_series jsonb
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
    COALESCE(s.dependencies, '[]'::jsonb) as dependencies,
    COALESCE(s.applicable_manufacturers, '[]'::jsonb) as applicable_manufacturers,
    COALESCE(s.applicable_series, '[]'::jsonb) as applicable_series
  FROM public.services s
  WHERE s.active = true
  ORDER BY s.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_services() TO anon, authenticated;
