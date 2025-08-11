
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1) Resolve the target user's id by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'michaelbyarssc@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', 'michaelbyarssc@gmail.com';
  END IF;

  -- 2) Backfill: assign all unowned/unassigned leads to this user.
  --    We only touch leads where both user_id and assigned_to are NULL
  --    to avoid inadvertently making other admins' leads visible.
  UPDATE public.leads
  SET assigned_to = v_user_id,
      updated_at = now()
  WHERE assigned_to IS NULL
    AND user_id IS NULL;

  -- 3) Optional quality-of-life: Assign any active chat sessions that currently
  --    have no agent to this user so Anonymous Chats + chat reviews are visible.
  UPDATE public.chat_sessions
  SET agent_id = v_user_id,
      updated_at = now()
  WHERE agent_id IS NULL
    AND status = 'active';
END $$;
