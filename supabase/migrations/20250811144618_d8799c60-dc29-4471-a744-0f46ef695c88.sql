-- Step 1: Reassign orphaned admin references to Michael (if available)
DO $$
DECLARE
  michael_id uuid;
BEGIN
  -- Try to resolve Michael's user_id from profiles
  SELECT user_id INTO michael_id 
  FROM public.profiles 
  WHERE email = 'michaelbyarssc@gmail.com'
  LIMIT 1;

  -- Reassign orphaned admin references to Michael when possible, otherwise leave as-is
  -- Transactions.assigned_admin_id
  UPDATE public.transactions t
  SET assigned_admin_id = michael_id
  WHERE assigned_admin_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = t.assigned_admin_id
    )
    AND michael_id IS NOT NULL;

  -- Chat sessions agent_id
  UPDATE public.chat_sessions cs
  SET agent_id = michael_id
  WHERE agent_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = cs.agent_id
    )
    AND michael_id IS NOT NULL;

  -- Appointments agent_id
  UPDATE public.appointments a
  SET agent_id = michael_id
  WHERE agent_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = a.agent_id
    )
    AND michael_id IS NOT NULL;

  -- Profiles.assigned_admin_id
  UPDATE public.profiles pr
  SET assigned_admin_id = michael_id
  WHERE assigned_admin_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = pr.assigned_admin_id
    )
    AND michael_id IS NOT NULL;
END $$;

-- Step 2: Drop existing foreign keys on these admin reference columns (if any)
DO $$
DECLARE
  cons RECORD;
BEGIN
  FOR cons IN 
    SELECT tc.constraint_name, tc.table_schema, tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name 
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (
        (tc.table_name = 'transactions' AND kcu.column_name = 'assigned_admin_id') OR
        (tc.table_name = 'profiles' AND kcu.column_name = 'assigned_admin_id') OR
        (tc.table_name = 'chat_sessions' AND kcu.column_name = 'agent_id') OR
        (tc.table_name = 'appointments' AND kcu.column_name = 'agent_id')
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', cons.table_schema, cons.table_name, cons.constraint_name);
  END LOOP;
END $$;

-- Step 3: Recreate safe foreign keys pointing to profiles(user_id) with ON DELETE SET NULL
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_assigned_admin
  FOREIGN KEY (assigned_admin_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_assigned_admin
  FOREIGN KEY (assigned_admin_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.chat_sessions
  ADD CONSTRAINT fk_chat_sessions_agent
  FOREIGN KEY (agent_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD CONSTRAINT fk_appointments_agent
  FOREIGN KEY (agent_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;