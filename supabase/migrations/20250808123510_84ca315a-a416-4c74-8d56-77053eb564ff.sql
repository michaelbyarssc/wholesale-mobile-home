-- Re-run migration without modifying is_admin()

-- 1) Ensure 'driver' exists in app_role enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'app_role' AND n.nspname = 'public' AND e.enumlabel = 'driver'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'driver';
    END IF;
  END IF;
END $$;

-- 2) Drop legacy trigger/function that auto-adds admin for super_admin
DO $$
DECLARE
  func_oid oid;
  r record;
BEGIN
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'ensure_super_admin_has_admin_role' AND n.nspname = 'public';

  IF func_oid IS NOT NULL THEN
    -- Drop any triggers calling this function
    FOR r IN
      SELECT tgname::text AS trig_name, c.relname::text AS rel_name
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      WHERE tg.tgfoid = func_oid
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trig_name, r.rel_name);
    END LOOP;

    -- Drop the function itself (and any dependent objects)
    DROP FUNCTION IF EXISTS public.ensure_super_admin_has_admin_role() CASCADE;
  END IF;
END $$;

-- 3) Deduplicate user_roles so each user has a single highest-priority role
WITH ranked AS (
  SELECT 
    id, user_id, role,
    row_number() OVER (
      PARTITION BY user_id 
      ORDER BY CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'driver' THEN 3
        WHEN 'user' THEN 4
        ELSE 5
      END
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id AND r.rn > 1;

-- 4) Enforce single role per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_unique' 
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;