
-- Fix: add explicit handling for 'factory_pickup_scheduled' and a safe ELSE branch
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
        when 'factory_pickup_scheduled' then
          -- No side effects needed; just avoid CASE not found
          null;
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
        else
          -- Future-proof: no-op for any other statuses
          null;
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
