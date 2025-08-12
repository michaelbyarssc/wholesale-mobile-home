
-- Fix: Remove invalid enum literals from delivery status automation trigger
-- and compare enum values using ::text to avoid invalid cast errors.

create or replace function public.trigger_delivery_status_automation_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d record;
  mapped_event text;
begin
  select id, customer_name, customer_email, customer_phone, transaction_number
  into d
  from public.deliveries
  where id = new.delivery_id
  limit 1;

  -- Compare as text to avoid enum casting errors
  if new.new_status::text = 'scheduled' then
    mapped_event := 'delivery_scheduled';

  elsif new.new_status::text in ('in_transit', 'delivery_in_progress') then
    mapped_event := 'delivery_in_progress';

  -- Consider both delivered and completed as "finished"
  elsif new.new_status::text in ('delivered', 'completed') then
    mapped_event := 'delivery_finished';

  else
    mapped_event := null;
  end if;

  if mapped_event is not null then
    perform public.emit_automation_event(
      mapped_event, 'delivery', new.delivery_id, null,
      d.customer_email, d.customer_phone,
      jsonb_build_object(
        'transaction_number', d.transaction_number,
        'customer_name', d.customer_name,
        'status', new.new_status::text,
        'notes', new.notes
      )
    );
  end if;

  return new;
end;
$$;
