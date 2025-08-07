
-- 1) Ensure profiles table exists with required columns
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  assigned_admin_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add any missing columns safely
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='first_name') then
    alter table public.profiles add column first_name text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='last_name') then
    alter table public.profiles add column last_name text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='email') then
    alter table public.profiles add column email text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='phone_number') then
    alter table public.profiles add column phone_number text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='assigned_admin_id') then
    alter table public.profiles add column assigned_admin_id uuid null references auth.users(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='created_at') then
    alter table public.profiles add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='profiles' and column_name='updated_at') then
    alter table public.profiles add column updated_at timestamptz not null default now();
  end if;
end
$$;

-- 2) Keep updated_at fresh
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='profiles_update_updated_at') then
    create trigger profiles_update_updated_at
    before update on public.profiles
    for each row
    execute function public.update_updated_at_column();
  end if;
end
$$;

-- 3) Enable RLS and add policies
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profiles' and policyname='Admins can manage all profiles'
  ) then
    create policy "Admins can manage all profiles"
      on public.profiles
      for all
      using (is_admin(auth.uid()))
      with check (is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profiles' and policyname='Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.profiles
      for select
      using (public.can_read_own_profile(user_id));
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profiles' and policyname='Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profiles' and policyname='Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- 4) Create trigger to auto-create profiles on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  fn text := null;
  ln text := null;
begin
  -- Prefer explicit first_name/last_name if present
  fn := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  ln := nullif(trim(new.raw_user_meta_data->>'last_name'), '');

  if (fn is null or ln is null) and length(coalesce(full_name, '')) > 0 then
    fn := coalesce(fn, split_part(full_name, ' ', 1));
    if position(' ' in full_name) > 0 then
      ln := coalesce(ln, trim(substr(full_name from position(' ' in full_name) + 1)));
    end if;
  end if;

  insert into public.profiles (user_id, email, phone_number, first_name, last_name)
  values (new.id, new.email, new.phone, fn, ln)
  on conflict (user_id) do update
    set email = excluded.email,
        phone_number = excluded.phone_number,
        updated_at = now();

  return new;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='on_auth_user_created_create_profile') then
    create trigger on_auth_user_created_create_profile
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end
$$;

-- 5) Backfill profiles for existing users (fill anything missing)
insert into public.profiles (user_id, email, phone_number, first_name, last_name)
select
  u.id,
  u.email,
  u.phone,
  coalesce(nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
           nullif(trim(split_part(u.raw_user_meta_data->>'full_name',' ',1)), '')),
  coalesce(nullif(trim(u.raw_user_meta_data->>'last_name'), ''),
           nullif(trim(
             case 
               when position(' ' in (u.raw_user_meta_data->>'full_name')) > 0 
               then substr(u.raw_user_meta_data->>'full_name', position(' ' in (u.raw_user_meta_data->>'full_name')) + 1)
               else null 
             end
           ), ''))
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- Optionally update missing names on existing profile rows
update public.profiles p
set first_name = coalesce(p.first_name,
                          nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
                          nullif(trim(split_part(u.raw_user_meta_data->>'full_name',' ',1)), '')),
    last_name = coalesce(p.last_name,
                         nullif(trim(u.raw_user_meta_data->>'last_name'), ''),
                         nullif(trim(
                           case
                             when position(' ' in (u.raw_user_meta_data->>'full_name')) > 0
                             then substr(u.raw_user_meta_data->>'full_name', position(' ' in (u.raw_user_meta_data->>'full_name')) + 1)
                             else null
                           end
                         ), '')),
    updated_at = now()
from auth.users u
where p.user_id = u.id
  and (p.first_name is null or p.last_name is null);
