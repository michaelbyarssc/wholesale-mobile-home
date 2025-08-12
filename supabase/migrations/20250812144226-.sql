-- Enable RLS on sensitive tables and restrict direct access
-- 1) mobile_homes: restrict to admins only (public reads via RPC already in use)
ALTER TABLE public.mobile_homes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mobile_homes' AND policyname = 'Admins can manage mobile_homes (ALL)'
  ) THEN
    CREATE POLICY "Admins can manage mobile_homes (ALL)"
      ON public.mobile_homes
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- 2) services: restrict to admins only; expose safe subset via RPC
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'Admins can manage services (ALL)'
  ) THEN
    CREATE POLICY "Admins can manage services (ALL)"
      ON public.services
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Public-safe RPC for services (no internal cost fields)
CREATE OR REPLACE FUNCTION public.get_public_services()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
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
    s.category,
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
