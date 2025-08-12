-- Secure RLS for orders and deliveries tables
-- Note: Policies are created conditionally to avoid duplicates on re-runs

-- Enable Row Level Security
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders'
  ) THEN
    RAISE NOTICE 'Table public.orders does not exist, skipping.';
  ELSE
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries'
  ) THEN
    RAISE NOTICE 'Table public.deliveries does not exist, skipping.';
  ELSE
    EXECUTE 'ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Orders policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- Admins can manage all orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Admins can manage all orders'
    ) THEN
      CREATE POLICY "Admins can manage all orders"
      ON public.orders
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
    END IF;

    -- Users can view their own orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users can view their own orders'
    ) THEN
      CREATE POLICY "Users can view their own orders"
      ON public.orders
      FOR SELECT
      USING (auth.uid() = user_id);
    END IF;

    -- Users can insert their own orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users can insert their own orders'
    ) THEN
      CREATE POLICY "Users can insert their own orders"
      ON public.orders
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update their own orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users can update their own orders'
    ) THEN
      CREATE POLICY "Users can update their own orders"
      ON public.orders
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users cannot delete orders; admins only (covered by admin ALL policy)
  END IF;
END $$;

-- Deliveries policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries') THEN
    -- Admins can manage all deliveries
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deliveries' AND policyname='Admins can manage all deliveries'
    ) THEN
      CREATE POLICY "Admins can manage all deliveries"
      ON public.deliveries
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
    END IF;

    -- Creators can view their deliveries
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deliveries' AND policyname='Creators can view their deliveries'
    ) THEN
      CREATE POLICY "Creators can view their deliveries"
      ON public.deliveries
      FOR SELECT
      USING (auth.uid() = created_by);
    END IF;

    -- Drivers can view assigned deliveries
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deliveries' AND policyname='Drivers can view assigned deliveries'
    ) THEN
      CREATE POLICY "Drivers can view assigned deliveries"
      ON public.deliveries
      FOR SELECT
      USING (public.is_driver_for_delivery(auth.uid(), id));
    END IF;

    -- Assigned drivers can update assigned deliveries
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deliveries' AND policyname='Drivers can update assigned deliveries'
    ) THEN
      CREATE POLICY "Drivers can update assigned deliveries"
      ON public.deliveries
      FOR UPDATE
      USING (public.is_driver_for_delivery(auth.uid(), id))
      WITH CHECK (public.is_driver_for_delivery(auth.uid(), id));
    END IF;

    -- Allow inserts only by admins (covered by admin ALL policy)
  END IF;
END $$;
