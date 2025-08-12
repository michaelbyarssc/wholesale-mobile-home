
-- Harden RLS for sensitive customer tables

do $$
declare pol record;
begin
  -- Helper to (re)enable RLS and force enforcement
  perform 1;

  -- 1) newsletter_subscribers: admin-only read, public subscribe
  execute 'alter table public.newsletter_subscribers enable row level security';
  execute 'alter table public.newsletter_subscribers force row level security';

  for pol in 
    select policyname, cmd
    from pg_policies 
    where schemaname = 'public' and tablename = 'newsletter_subscribers'
  loop
    execute format('drop policy %I on public.newsletter_subscribers', pol.policyname);
  end loop;

  execute 'create policy "Admins can view newsletter subscribers"
           on public.newsletter_subscribers
           for select
           using (is_admin(auth.uid()));';

  execute 'create policy "Anyone can subscribe to newsletter"
           on public.newsletter_subscribers
           for insert
           with check (true);';

  execute 'create policy "Only admins can update newsletter subscribers"
           on public.newsletter_subscribers
           for update
           using (is_admin(auth.uid()))
           with check (is_admin(auth.uid()));';

  execute 'create policy "Only admins can delete newsletter subscribers"
           on public.newsletter_subscribers
           for delete
           using (is_admin(auth.uid()));';


  -- 2) anonymous_chat_users: restrict reads to assigned admins or active chat token
  execute 'alter table public.anonymous_chat_users enable row level security';
  execute 'alter table public.anonymous_chat_users force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''anonymous_chat_users''
  loop
    execute format('drop policy %I on public.anonymous_chat_users', pol.policyname);
  end loop;

  execute 'create policy "Admins can update anonymous chat users"
           on public.anonymous_chat_users
           for update
           using (is_admin(auth.uid()))
           with check (is_admin(auth.uid()));';

  execute '' ||
  'create policy "Admins can view assigned anonymous chat users" ' ||
  'on public.anonymous_chat_users for select ' ||
  'using (exists ( ' ||
  '  select 1 from user_roles ur ' ||
  '  join chat_sessions cs on cs.agent_id = ur.user_id ' ||
  '  where ur.user_id = auth.uid() and ur.role in (''admin'',''super_admin'') ' ||
  '    and cs.id = anonymous_chat_users.session_id ' ||
  '));';

  execute '' ||
  'create policy "Anonymous visitors can view their own anonymous chat user" ' ||
  'on public.anonymous_chat_users for select ' ||
  'using (exists ( ' ||
  '  select 1 from chat_sessions cs ' ||
  '  where cs.id = anonymous_chat_users.session_id ' ||
  '    and cs.session_token = get_request_header(''x-chat-token'') ' ||
  '    and cs.status = ''active'' ' ||
  '));';

  execute '' ||
  'create policy "Insert with valid session" ' ||
  'on public.anonymous_chat_users for insert ' ||
  'with check (exists ( ' ||
  '  select 1 from chat_sessions cs ' ||
  '  where cs.id = anonymous_chat_users.session_id ' ||
  '));';


  -- 3) appointments: keep public booking, restrict reads/updates to owner/agent/admin
  execute 'alter table public.appointments enable row level security';
  execute 'alter table public.appointments force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''appointments''
  loop
    execute format('drop policy %I on public.appointments', pol.policyname);
  end loop;

  execute 'create policy "Admins can manage all appointments"
           on public.appointments
           for all
           using (is_admin(auth.uid()))
           with check (is_admin(auth.uid()));';

  execute 'create policy "Agents can manage assigned appointments"
           on public.appointments
           for all
           using (auth.uid() = agent_id or is_admin(auth.uid()))
           with check (auth.uid() = agent_id or is_admin(auth.uid()));';

  execute 'create policy "Anyone can create appointments"
           on public.appointments
           for insert
           with check (true);';

  execute '' ||
  'create policy "Users can view their own appointments" ' ||
  'on public.appointments for select ' ||
  'using ( ' ||
  '  auth.uid() = user_id ' ||
  '  or customer_email = (select users.email from auth.users where users.id = auth.uid()) ' ||
  ');';

  execute '' ||
  'create policy "Users can update their own appointments" ' ||
  'on public.appointments for update ' ||
  'using ( ' ||
  '  auth.uid() = user_id ' ||
  '  or customer_email = (select users.email from auth.users where users.id = auth.uid()) ' ||
  ') ' ||
  'with check ( ' ||
  '  auth.uid() = user_id ' ||
  '  or customer_email = (select users.email from auth.users where users.id = auth.uid()) ' ||
  ');';


  -- 4) estimates: no public read, public insert ok (estimate request), owner/admin read/update
  execute 'alter table public.estimates enable row level security';
  execute 'alter table public.estimates force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''estimates''
  loop
    execute format('drop policy %I on public.estimates', pol.policyname);
  end loop;

  execute 'create policy "Admins can view all estimates"
           on public.estimates
           for select
           using (is_admin(auth.uid()));';

  execute 'create policy "Users can view their own estimates"
           on public.estimates
           for select
           using (auth.uid() = user_id);';

  execute 'create policy "Anyone can create estimates"
           on public.estimates
           for insert
           with check (true);';

  execute 'create policy "Users can update their own estimates"
           on public.estimates
           for update
           using (auth.uid() = user_id or is_admin(auth.uid()))
           with check (auth.uid() = user_id or is_admin(auth.uid()));';

  execute 'create policy "Only admins can delete estimates"
           on public.estimates
           for delete
           using (is_admin(auth.uid()));';


  -- 5) invoices: admin or owner read; updates/deletes admin-only
  execute 'alter table public.invoices enable row level security';
  execute 'alter table public.invoices force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''invoices''
  loop
    execute format('drop policy %I on public.invoices', pol.policyname);
  end loop;

  execute 'create policy "Admins can view all invoices"
           on public.invoices
           for select
           using (is_admin(auth.uid()));';

  execute 'create policy "Users can view their own invoices"
           on public.invoices
           for select
           using (auth.uid() = user_id);';

  execute 'create policy "Only admins can update invoices"
           on public.invoices
           for update
           using (is_admin(auth.uid()))
           with check (is_admin(auth.uid()));';

  execute 'create policy "Only admins can delete invoices"
           on public.invoices
           for delete
           using (is_admin(auth.uid()));';


  -- 6) leads: public insert (lead capture), restrict reads to owner/assignee/admin
  execute 'alter table public.leads enable row level security';
  execute 'alter table public.leads force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''leads''
  loop
    execute format('drop policy %I on public.leads', pol.policyname);
  end loop;

  execute 'create policy "Admins can view all leads"
           on public.leads
           for select
           using (is_admin(auth.uid()));';

  execute 'create policy "Users can view their leads"
           on public.leads
           for select
           using (auth.uid() = user_id or auth.uid() = assigned_to);';

  execute 'create policy "Anyone can create leads"
           on public.leads
           for insert
           with check (true);';

  execute 'create policy "Users can update their leads"
           on public.leads
           for update
           using (auth.uid() = user_id or auth.uid() = assigned_to or is_admin(auth.uid()))
           with check (auth.uid() = user_id or auth.uid() = assigned_to or is_admin(auth.uid()));';

  execute 'create policy "Only admins can delete leads"
           on public.leads
           for delete
           using (is_admin(auth.uid()));';


  -- 7) transactions: owner/admin read; authenticated insert; admin-only delete
  execute 'alter table public.transactions enable row level security';
  execute 'alter table public.transactions force row level security';

  for pol in 
    select policyname from pg_policies 
    where schemaname = ''public'' and tablename = ''transactions''
  loop
    execute format('drop policy %I on public.transactions', pol.policyname);
  end loop;

  execute 'create policy "Admins can view all transactions"
           on public.transactions
           for select
           using (is_admin(auth.uid()));';

  execute 'create policy "Users can view their own transactions"
           on public.transactions
           for select
           using (auth.uid() = user_id);';

  execute 'create policy "Authenticated users can create their own transactions"
           on public.transactions
           for insert
           with check (auth.uid() is not null and auth.uid() = user_id);';

  execute 'create policy "Users can update their own transactions"
           on public.transactions
           for update
           using (auth.uid() = user_id or is_admin(auth.uid()))
           with check (auth.uid() = user_id or is_admin(auth.uid()));';

  execute 'create policy "Only admins can delete transactions"
           on public.transactions
           for delete
           using (is_admin(auth.uid()));';

end
$$;
