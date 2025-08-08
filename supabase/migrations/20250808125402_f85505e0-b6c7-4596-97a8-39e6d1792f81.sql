
-- 1) Enable RLS on delivery_assignments
alter table public.delivery_assignments enable row level security;

-- 2) Admins manage all assignments
drop policy if exists "Admins manage delivery assignments" on public.delivery_assignments;
create policy "Admins manage delivery assignments"
  on public.delivery_assignments
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- 3) Drivers can view their own assignments
drop policy if exists "Drivers can view own assignments" on public.delivery_assignments;
create policy "Drivers can view own assignments"
  on public.delivery_assignments
  for select
  using (
    exists (
      select 1
      from public.drivers d
      where d.id = delivery_assignments.driver_id
        and d.user_id = auth.uid()
    )
  );

-- 4) Drivers can update their own assignments
drop policy if exists "Drivers can update own assignments" on public.delivery_assignments;
create policy "Drivers can update own assignments"
  on public.delivery_assignments
  for update
  using (
    exists (
      select 1
      from public.drivers d
      where d.id = delivery_assignments.driver_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.drivers d
      where d.id = delivery_assignments.driver_id
        and d.user_id = auth.uid()
    )
  );

-- 5) Side-effects trigger: set timestamps on status transitions; keep JSON phase_times if present; bump updated_at if present
create or replace function public.apply_delivery_assignment_side_effects()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if (tg_op = 'UPDATE') then
    if old.assignment_status is distinct from new.assignment_status then
      -- Mark accept/decline/start/complete times if those columns exist
      begin
        if new.assignment_status = 'accepted' and new.accepted_at is null then
          new.accepted_at := now();
        end if;
      exception when undefined_column then
        null;
      end;

      begin
        if new.assignment_status = 'declined' and new.declined_at is null then
          new.declined_at := now();
        end if;
      exception when undefined_column then
        null;
      end;

      begin
        if new.assignment_status in ('in_progress','started') and new.started_at is null then
          new.started_at := now();
        end if;
      exception when undefined_column then
        null;
      end;

      begin
        if new.assignment_status in ('completed','finished') and new.completed_at is null then
          new.completed_at := now();
        end if;
      exception when undefined_column then
        null;
      end;

      -- If a phase_times JSONB exists, write a generic timeline key like "<status>_at": timestamp
      begin
        new.phase_times := jsonb_set(
          coalesce(new.phase_times, '{}'::jsonb),
          ARRAY[(new.assignment_status || '_at')::text],
          to_jsonb(now()),
          true
        );
      exception when undefined_column then
        null;
      end;
    end if;

    -- Always try to bump updated_at if that column exists
    begin
      new.updated_at := now();
    exception when undefined_column then
      null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_delivery_assignment_side_effects on public.delivery_assignments;
create trigger trg_apply_delivery_assignment_side_effects
before update on public.delivery_assignments
for each row
execute function public.apply_delivery_assignment_side_effects();
