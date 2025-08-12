-- Secure newsletter_subscribers table RLS and policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Enable and enforce RLS
  EXECUTE 'ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY';

  -- Remove any existing SELECT policies to prevent public reads
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers', pol.policyname);
  END LOOP;

  -- Create admin-only SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND policyname = 'Admins can view newsletter subscribers'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can view newsletter subscribers"
      ON public.newsletter_subscribers
      FOR SELECT
      USING (is_admin(auth.uid()));
    $$;
  END IF;

  -- Ensure public INSERT policy exists (keeps signup working)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND cmd = 'INSERT'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Anyone can subscribe to newsletter"
      ON public.newsletter_subscribers
      FOR INSERT
      WITH CHECK (true);
    $$;
  END IF;

  -- Remove existing UPDATE policies and add admin-only
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers', pol.policyname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND policyname = 'Only admins can update newsletter subscribers'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Only admins can update newsletter subscribers"
      ON public.newsletter_subscribers
      FOR UPDATE
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
    $$;
  END IF;

  -- Remove existing DELETE policies and add admin-only
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers', pol.policyname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND policyname = 'Only admins can delete newsletter subscribers'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Only admins can delete newsletter subscribers"
      ON public.newsletter_subscribers
      FOR DELETE
      USING (is_admin(auth.uid()));
    $$;
  END IF;
END
$$;