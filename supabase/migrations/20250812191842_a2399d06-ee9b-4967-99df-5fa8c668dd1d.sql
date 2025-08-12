
-- Replace schedule_factory_pickup to correctly cast dates and improve robustness
create or replace function public.schedule_factory_pickup(
  p_delivery_id uuid,
  p_driver_ids uuid[],
  p_scheduled_pickup timestamptz default null,
  p_scheduled_delivery timestamptz default null,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_special_instructions text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  d deliveries%rowtype;
  prev_status public.delivery_status;
  new_status public.delivery_status := 'factory_pickup_scheduled';
  did uuid := p_delivery_id;
  drv uuid;
begin
  -- Authorization: only admins/super_admins
  if not is_admin(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'Not authorized');
  end if;

  -- Lock delivery row
  select * into d from deliveries where id = did for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Delivery not found');
  end if;

  prev_status := d.status;

  RAISE NOTICE 'SFP: Updating delivery % (prev_status=%)', did, prev_status;

  -- Update delivery core fields (cast timestamptz -> date for DATE columns)
  update deliveries
  set
    status = new_status,
    scheduled_pickup_date   = coalesce((p_scheduled_pickup   at time zone 'UTC')::date, scheduled_pickup_date),
    scheduled_delivery_date = coalesce((p_scheduled_delivery at time zone 'UTC')::date, scheduled_delivery_date),
    pickup_address          = coalesce(p_pickup_address, pickup_address),
    delivery_address        = coalesce(p_delivery_address, delivery_address),
    special_instructions    = coalesce(p_special_instructions, special_instructions),
    updated_at              = now()
  where id = did;

  -- Replace driver assignments with provided list
  delete from delivery_assignments where delivery_id = did;

  if p_driver_ids is not null then
    foreach drv in array p_driver_ids loop
      RAISE NOTICE 'SFP: Assigning driver % to delivery %', drv, did;
      insert into delivery_assignments (
        delivery_id, driver_id, assigned_at, assigned_by, active, role
      ) values (
        did, drv, now(), auth.uid(), true, 'primary'
      )
      on conflict (delivery_id, driver_id, role)
      do update set
        active = excluded.active,
        assigned_at = now(),
        assigned_by = auth.uid();
    end loop;
  end if;

  -- Log status change
  insert into delivery_status_history (
    delivery_id, previous_status, new_status, changed_by, notes
  ) values (
    did, prev_status, new_status, auth.uid(), 'Factory pickup scheduled via RPC'
  );

  RAISE NOTICE 'SFP: Completed for delivery % (new_status=%)', did, new_status;
  return jsonb_build_object('success', true, 'delivery_id', did, 'previous_status', prev_status, 'new_status', new_status);

exception when others then
  -- Return the exact error to the client for better diagnostics
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;
