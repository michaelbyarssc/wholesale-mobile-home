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

-- 2) Ensure required columns exist (idempotent)
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 3) Ensure unique index on user_id
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

-- 4) Ensure FK constraint exists
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_user_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end$$;

-- 5) Trigger to keep updated_at fresh
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop and recreate trigger for updated_at to be safe
do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'update_profiles_updated_at'
  ) then
    drop trigger update_profiles_updated_at on public.profiles;
  end if;
end$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 6) Enable RLS
alter table public.profiles enable row level security;

-- 7) Policies (idempotent: drop if exists then create)
-- Admins can manage all profiles
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
  on public.profiles
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Users can view their own profile
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (public.can_read_own_profile(user_id));

-- Users can upsert their own profile
drop policy if exists "Users can upsert their own profile" on public.profiles;
create policy "Users can upsert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8) Auto-insert profile on new auth user
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  fn text;
  ln text;
  em text;
  ph text;
  full text;
begin
  em := new.email;
  ph := coalesce(new.phone, new.raw_user_meta_data->>'phone');
  fn := new.raw_user_meta_data->>'first_name';
  ln := new.raw_user_meta_data->>'last_name';
  full := new.raw_user_meta_data->>'full_name';

  if (fn is null and ln is null and full is not null) then
    fn := nullif(split_part(full, ' ', 1), '');
    ln := nullif(split_part(full, ' ', 2), '');
  end if;

  insert into public.profiles (user_id, first_name, last_name, email, phone_number)
  values (new.id, fn, ln, em, ph)
  on conflict (user_id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);

  return new;
end;
$$;

-- Drop and recreate the trigger to avoid duplicates
do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_profile'
  ) then
    drop trigger on_auth_user_created_profile on auth.users;
  end if;
end$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- 9) Backfill existing users without profiles
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
