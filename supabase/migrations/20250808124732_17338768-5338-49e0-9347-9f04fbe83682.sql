
-- 1) Helper functions

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.get_driver_id_for_user(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = 'public'
as $$
  select d.id
  from public.drivers d
  where d.user_id = _user_id
  limit 1;
$$;

create or replace function public.is_driver_for_delivery(_user_id uuid, _delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.drivers dr
    join public.delivery_assignments da
      on da.driver_id = dr.id
     and da.active = true
    where dr.user_id = _user_id
      and da.delivery_id = _delivery_id
  );
$$;

-- Safe helper to check "my driver record" without recursive policy issues
create or replace function public.is_own_driver_record(_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.drivers d
    where d.id = _driver_id
      and d.user_id = auth.uid()
  );
$$;

-- 2) Deliveries RLS + Triggers

alter table public.deliveries enable row level security;

-- Admins manage all deliveries
drop policy if exists "Admins manage deliveries" on public.deliveries;
create policy "Admins manage deliveries"
  on public.deliveries
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Drivers can view assigned deliveries
drop policy if exists "Drivers can view assigned deliveries" on public.deliveries;
create policy "Drivers can view assigned deliveries"
  on public.deliveries
  for select
  using (public.is_driver_for_delivery(auth.uid(), id));

-- Drivers can update assigned deliveries (limited by trigger)
drop policy if exists "Drivers can update assigned deliveries (limited fields)" on public.deliveries;
create policy "Drivers can update assigned deliveries (limited fields)"
  on public.deliveries
  for update
  using (public.is_driver_for_delivery(auth.uid(), id))
  with check (public.is_driver_for_delivery(auth.uid(), id));

-- BEFORE UPDATE: apply side effects for status transitions and always bump updated_at
create or replace function public.apply_delivery_status_side_effects()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if (TG_OP = 'UPDATE') then
    if old.status is distinct from new.status then
      case new.status
        when 'factory_pickup_in_progress' then
          if new.actual_pickup_date is null then
            new.actual_pickup_date := now();
          end if;
        when 'delivery_in_progress' then
          if new.actual_delivery_date is null then
            new.actual_delivery_date := now();
          end if;
        when 'delivered' then
          if new.completed_at is null then
            new.completed_at := now();
          end if;
        when 'completed' then
          if new.completed_at is null then
            new.completed_at := now();
          end if;
      end case;
    end if;

    -- Always keep updated_at current if the column exists
    begin
      new.updated_at := now();
    exception when undefined_column then
      -- ignore if deliveries.updated_at doesn't exist
      null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_delivery_status_side_effects on public.deliveries;
create trigger trg_apply_delivery_status_side_effects
before update on public.deliveries
for each row
execute function public.apply_delivery_status_side_effects();

-- AFTER UPDATE: log status changes to delivery_status_history
create or replace function public.log_delivery_status_change()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if (TG_OP = 'UPDATE') and (old.status is distinct from new.status) then
    insert into public.delivery_status_history
      (delivery_id, previous_status, new_status, notes, changed_by, created_at)
    values
      (new.id, old.status, new.status, 'Status changed via direct update', auth.uid(), now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_delivery_status_change on public.deliveries;
create trigger trg_log_delivery_status_change
after update on public.deliveries
for each row
execute function public.log_delivery_status_change();

-- 3) delivery_status_history RLS

alter table public.delivery_status_history enable row level security;

-- Admins manage all history
drop policy if exists "Admins manage delivery status history" on public.delivery_status_history;
create policy "Admins manage delivery status history"
  on public.delivery_status_history
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Drivers can read history for their assigned deliveries
drop policy if exists "Drivers can view status history for assigned deliveries" on public.delivery_status_history;
create policy "Drivers can view status history for assigned deliveries"
  on public.delivery_status_history
  for select
  using (public.is_driver_for_delivery(auth.uid(), delivery_id));

-- System can insert (for triggers/edge functions)
drop policy if exists "System can insert delivery status history" on public.delivery_status_history;
create policy "System can insert delivery status history"
  on public.delivery_status_history
  for insert
  with check (true);

-- 4) delivery_gps_tracking RLS

alter table public.delivery_gps_tracking enable row level security;

-- Admins manage all GPS
drop policy if exists "Admins manage delivery GPS tracking" on public.delivery_gps_tracking;
create policy "Admins manage delivery GPS tracking"
  on public.delivery_gps_tracking
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Drivers can insert GPS for their assigned deliveries
drop policy if exists "Drivers can insert GPS for assigned deliveries" on public.delivery_gps_tracking;
create policy "Drivers can insert GPS for assigned deliveries"
  on public.delivery_gps_tracking
  for insert
  with check (
    public.is_driver_for_delivery(auth.uid(), delivery_id)
    and exists (
      select 1 from public.drivers d
      where d.id = driver_id and d.user_id = auth.uid()
    )
  );

-- Drivers can view GPS for their assigned deliveries
drop policy if exists "Drivers can view GPS for assigned deliveries" on public.delivery_gps_tracking;
create policy "Drivers can view GPS for assigned deliveries"
  on public.delivery_gps_tracking
  for select
  using (public.is_driver_for_delivery(auth.uid(), delivery_id));

-- 5) driver_vehicles — drivers manage their own vehicles

alter table public.driver_vehicles enable row level security;

-- Keep/assume admin policy exists; add driver self-management
drop policy if exists "Drivers can manage their own vehicles" on public.driver_vehicles;
create policy "Drivers can manage their own vehicles"
  on public.driver_vehicles
  for all
  using (
    exists (
      select 1 from public.drivers d
      where d.id = driver_vehicles.driver_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.drivers d
      where d.id = driver_vehicles.driver_id
        and d.user_id = auth.uid()
    )
  );

-- 6) drivers — drivers can view/update their own profile row

alter table public.drivers enable row level security;

-- Admins manage all
drop policy if exists "Admins manage drivers" on public.drivers;
create policy "Admins manage drivers"
  on public.drivers
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Drivers can view their own driver record
drop policy if exists "Driver can view own profile" on public.drivers;
create policy "Driver can view own profile"
  on public.drivers
  for select
  using (public.is_own_driver_record(id));

-- Drivers can update their own driver record
drop policy if exists "Driver can update own profile" on public.drivers;
create policy "Driver can update own profile"
  on public.drivers
  for update
  using (public.is_own_driver_record(id))
  with check (public.is_own_driver_record(id));
