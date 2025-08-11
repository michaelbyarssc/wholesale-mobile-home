
-- 1) LEADS: Strict per-user (owner or assigned) isolation

alter table public.leads enable row level security;

-- Remove any broad admin policies if they exist
drop policy if exists "Admins can manage all leads" on public.leads;

-- Users can view leads they own or are assigned to
create policy "Users can view own or assigned leads"
on public.leads
for select
using (
  auth.uid() = user_id
  or auth.uid() = assigned_to
);

-- Users can insert leads they own or are assigned to (LeadForm sets both to current user)
create policy "Users can insert own leads"
on public.leads
for insert
with check (
  auth.uid() = user_id
  or auth.uid() = assigned_to
);

-- Users can update leads they own or are assigned to
create policy "Users can update own or assigned leads"
on public.leads
for update
using (
  auth.uid() = user_id
  or auth.uid() = assigned_to
)
with check (
  auth.uid() = user_id
  or auth.uid() = assigned_to
);

-- Users can delete leads they own or are assigned to
create policy "Users can delete own or assigned leads"
on public.leads
for delete
using (
  auth.uid() = user_id
  or auth.uid() = assigned_to
);



-- 2) FOLLOW_UPS: Only for leads you own or are assigned to

alter table public.follow_ups enable row level security;

-- Remove any broad admin policies if they exist
drop policy if exists "Admins can manage all follow ups" on public.follow_ups;
drop policy if exists "Admins can manage all follow_ups" on public.follow_ups;

-- View follow-ups for your leads
create policy "Users can view follow ups for their leads"
on public.follow_ups
for select
using (
  exists (
    select 1
    from public.leads l
    where l.id = follow_ups.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

-- Insert follow-ups only for your leads
create policy "Users can insert follow ups for their leads"
on public.follow_ups
for insert
with check (
  exists (
    select 1
    from public.leads l
    where l.id = follow_ups.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

-- Update follow-ups only for your leads
create policy "Users can update follow ups for their leads"
on public.follow_ups
for update
using (
  exists (
    select 1
    from public.leads l
    where l.id = follow_ups.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = follow_ups.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

-- Delete follow-ups only for your leads
create policy "Users can delete follow ups for their leads"
on public.follow_ups
for delete
using (
  exists (
    select 1
    from public.leads l
    where l.id = follow_ups.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);



-- 3) CUSTOMER_INTERACTIONS: remove broad admin access; isolate by lead ownership/assignment

alter table public.customer_interactions enable row level security;

-- Remove any broad admin policy that grants cross-tenant access
drop policy if exists "Admins can manage all interactions" on public.customer_interactions;

-- Replace with explicit per-action policies tied to the lead’s ownership/assignment
drop policy if exists "Users can manage interactions for their leads" on public.customer_interactions;

create policy "Users can view interactions for their leads"
on public.customer_interactions
for select
using (
  exists (
    select 1
    from public.leads l
    where l.id = customer_interactions.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

create policy "Users can insert interactions for their leads"
on public.customer_interactions
for insert
with check (
  exists (
    select 1
    from public.leads l
    where l.id = customer_interactions.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

create policy "Users can update interactions for their leads"
on public.customer_interactions
for update
using (
  exists (
    select 1
    from public.leads l
    where l.id = customer_interactions.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = customer_interactions.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);

create policy "Users can delete interactions for their leads"
on public.customer_interactions
for delete
using (
  exists (
    select 1
    from public.leads l
    where l.id = customer_interactions.lead_id
      and (auth.uid() = l.user_id or auth.uid() = l.assigned_to)
  )
);
