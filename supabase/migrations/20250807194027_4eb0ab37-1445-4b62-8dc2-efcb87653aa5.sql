-- Retry migration with corrected variable names
-- 1) Create profiles table if not exists
create table if not exists public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid unique not null,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- Ensure columns (idempotent)
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Unique index on user_id
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

-- Ensure FK constraint exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_user_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end$$;

-- updated_at trigger function (idempotent)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate trigger safely
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'update_profiles_updated_at') then
    drop trigger update_profiles_updated_at on public.profiles;
  end if;
end$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
 drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

 drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (public.can_read_own_profile(user_id));

 drop policy if exists "Users can upsert their own profile" on public.profiles;
create policy "Users can upsert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

 drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-insert profile trigger function (fixed var names)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_email text;
  v_phone text;
  v_full_name text;
begin
  v_email := new.email;
  v_phone := coalesce(new.phone, new.raw_user_meta_data->>'phone');
  v_first := new.raw_user_meta_data->>'first_name';
  v_last := new.raw_user_meta_data->>'last_name';
  v_full_name := new.raw_user_meta_data->>'full_name';

  if (v_first is null and v_last is null and v_full_name is not null) then
    v_first := nullif(split_part(v_full_name, ' ', 1), '');
    v_last := nullif(split_part(v_full_name, ' ', 2), '');
  end if;

  insert into public.profiles (user_id, first_name, last_name, email, phone_number)
  values (new.id, v_first, v_last, v_email, v_phone)
  on conflict (user_id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);

  return new;
end;
$$;

-- Recreate auth trigger safely
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_profile') then
    drop trigger on_auth_user_created_profile on auth.users;
  end if;
end$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- Backfill existing users without profiles
insert into public.profiles (user_id, first_name, last_name, email, phone_number)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'first_name',
    nullif(split_part(u.raw_user_meta_data->>'full_name', ' ', 1), ''),
    nullif(split_part(u.email, '@', 1), '')
  ) as first_name,
  coalesce(
    u.raw_user_meta_data->>'last_name',
    nullif(split_part(u.raw_user_meta_data->>'full_name', ' ', 2), '')
  ) as last_name,
  u.email,
  coalesce(u.raw_user_meta_data->>'phone', u.phone)
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;
