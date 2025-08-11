
-- 1) Event capture table
create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  entity_type text not null, -- 'transaction' | 'delivery' | 'invoice' | 'factory' | 'estimate'
  entity_id uuid not null,
  user_id uuid null,                -- customer user id, if available
  customer_email text null,
  customer_phone text null,
  payload jsonb not null default '{}'::jsonb, -- extra context: numbers, amounts, etc.
  occurred_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz null,
  error text null
);

create index if not exists idx_automation_events_processed on public.automation_events(processed, occurred_at);
create index if not exists idx_automation_events_event_name on public.automation_events(event_name);
create index if not exists idx_automation_events_entity on public.automation_events(entity_type, entity_id);

-- RLS: admins can read; system can manage
alter table public.automation_events enable row level security;

create policy "Admins can view automation events"
on public.automation_events
for select
using (is_admin(auth.uid()));

create policy "System can insert automation events"
on public.automation_events
for insert
with check (true);

create policy "System can update automation events"
on public.automation_events
for update
using (true)
with check (true);

-- 2) Helper function to emit events
create or replace function public.emit_automation_event(
  p_event_name text,
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid default null,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_id uuid;
begin
  insert into public.automation_events (
    event_name, entity_type, entity_id, user_id, customer_email, customer_phone, payload
  ) values (
    p_event_name, p_entity_type, p_entity_id, p_user_id, p_customer_email, p_customer_phone, coalesce(p_payload, '{}'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- 3) Transactions: emit events on insert/update status transitions
create or replace function public.trigger_transaction_automation_events()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  evt_name text;
begin
  -- Estimate Sent: initial creation as estimate_submitted
  if (tg_op = 'INSERT') then
    if new.status = 'estimate_submitted' then
      perform public.emit_automation_event(
        'estimate_sent', 'transaction', new.id, new.user_id,
        new.customer_email, new.customer_phone,
        jsonb_build_object(
          'transaction_number', new.transaction_number,
          'customer_name', new.customer_name,
          'total_amount', new.total_amount
        )
      );
    end if;
    return new;
  end if;

  -- Status changes on UPDATE
  if (tg_op = 'UPDATE') and (old.status is distinct from new.status) then
    -- Map statuses to event names
    if new.status = 'estimate_approved' then
      evt_name := 'estimate_approved';
    elsif new.status = 'invoice_generated' then
      evt_name := 'invoice_created';
    elsif new.status = 'delivery_scheduled' then
      evt_name := 'delivery_scheduled';
    elsif new.status = 'delivery_in_progress' then
      evt_name := 'delivery_in_progress';
    elsif new.status = 'delivery_complete' then
      evt_name := 'delivery_finished';
    elsif new.status = 'completed' then
      evt_name := 'transaction_completed';
    else
      evt_name := null;
    end if;

    if evt_name is not null then
      perform public.emit_automation_event(
        evt_name, 'transaction', new.id, new.user_id,
        new.customer_email, new.customer_phone,
        jsonb_build_object(
          'transaction_number', new.transaction_number,
          'customer_name', new.customer_name,
          'old_status', old.status,
          'new_status', new.status,
          'total_amount', new.total_amount
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists automation_transaction_events_trigger on public.transactions;
create trigger automation_transaction_events_trigger
after insert or update on public.transactions
for each row execute function public.trigger_transaction_automation_events();

-- 4) Payments: emit Payment Made
create or replace function public.trigger_payment_automation_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t public.transactions%rowtype;
begin
  select * into t from public.transactions where id = new.transaction_id limit 1;

  perform public.emit_automation_event(
    'payment_made', 'transaction', new.transaction_id, t.user_id,
    t.customer_email, t.customer_phone,
    jsonb_build_object(
      'transaction_number', t.transaction_number,
      'customer_name', t.customer_name,
      'amount', new.amount,
      'payment_method', new.payment_method,
      'payment_reference', new.payment_reference
    )
  );

  return new;
end;
$$;

drop trigger if exists automation_payment_events_trigger on public.transaction_payments;
create trigger automation_payment_events_trigger
after insert on public.transaction_payments
for each row execute function public.trigger_payment_automation_event();

-- 5) Invoices: emit Invoice Created (covers paths that create invoices directly)
create or replace function public.trigger_invoice_created_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t public.transactions%rowtype;
begin
  -- Try to stitch transaction by number if available (optional),
  -- otherwise just emit with invoice context.
  -- If your schema links invoice->estimate->transaction, you can tailor this join.
  perform public.emit_automation_event(
    'invoice_created', 'invoice', new.id, null,
    null, null,
    jsonb_build_object(
      'invoice_number', new.invoice_number,
      'customer_name', new.customer_name,
      'customer_email', new.customer_email,
      'customer_phone', new.customer_phone,
      'total_amount', new.total_amount
    )
  );

  return new;
end;
$$;

drop trigger if exists automation_invoice_events_trigger on public.invoices;
create trigger automation_invoice_events_trigger
after insert on public.invoices
for each row execute function public.trigger_invoice_created_event();

-- 6) Delivery status updates: emit delivery events on status history insert
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

  if new.new_status in ('scheduled') then
    mapped_event := 'delivery_scheduled';
  elsif new.new_status in ('in_transit', 'in_progress') then
    mapped_event := 'delivery_in_progress';
  elsif new.new_status in ('arrived', 'on_site') then
    mapped_event := 'delivery_arrived';
  elsif new.new_status in ('completed', 'delivered', 'finished') then
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
        'status', new.new_status,
        'notes', new.notes
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists automation_delivery_status_events_trigger on public.delivery_status_history;
create trigger automation_delivery_status_events_trigger
after insert on public.delivery_status_history
for each row execute function public.trigger_delivery_status_automation_event();

-- 7) Factory communications: emit when Home is ready for pickup/scheduling
create or replace function public.trigger_factory_ready_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d record;
  st text := coalesce(new.parsed_data->>'status', '');
  conf numeric := coalesce((new.parsed_data->>'confidence')::numeric, 0);
begin
  if st = 'ready_for_pickup' and conf >= 0.75 then
    if new.delivery_id is not null then
      select id, customer_name, customer_email, customer_phone, transaction_number
      into d
      from public.deliveries
      where id = new.delivery_id
      limit 1;

      perform public.emit_automation_event(
        'home_ready_for_delivery', 'delivery', new.delivery_id, null,
        d.customer_email, d.customer_phone,
        jsonb_build_object(
          'transaction_number', d.transaction_number,
          'customer_name', d.customer_name,
          'factory_id', new.factory_id
        )
      );
    else
      -- if no delivery_id discovered, still emit with factory context
      perform public.emit_automation_event(
        'home_ready_for_delivery', 'factory', new.factory_id, null, null, null,
        jsonb_build_object(
          'factory_id', new.factory_id,
          'communication_id', new.id
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists automation_factory_ready_events_trigger on public.factory_communications;
create trigger automation_factory_ready_events_trigger
after insert on public.factory_communications
for each row execute function public.trigger_factory_ready_event();
