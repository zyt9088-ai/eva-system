-- Roles + RLS for نظام قيّم
-- Safe to re-run: every statement is idempotent (create-if-not-exists / drop-if-exists / create-or-replace).

-- 1. profiles table -----------------------------------------------------
-- IMPORTANT: a row here is the ONLY thing that grants access to the internal
-- dashboard. Anyone who logs in via Microsoft without a matching pending_invite
-- gets NO row created (see handle_new_user below) and is sent to /no-access.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'specialist' check (role in ('admin', 'specialist')),
  created_at timestamptz not null default now()
);

-- helper used by policies below (must exist before any policy references it)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 1b. pending invites ------------------------------------------------------
-- Lets an admin pre-assign a role to an @mngdp.com email BEFORE that person
-- ever signs in. Consumed automatically the first time they log in via Azure.
create table if not exists public.pending_invites (
  email text primary key check (email ~* '^[^@\s]+@mngdp\.com$'),
  role text not null default 'specialist' check (role in ('admin', 'specialist')),
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.pending_invites enable row level security;

drop policy if exists "admin manages invites" on public.pending_invites;
create policy "admin manages invites" on public.pending_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Whenever a new user signs in via Azure: only create a profile (i.e. grant
-- access) if their email was pre-invited. Everyone else gets no profile row
-- at all, so the app can send them to /no-access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invited_role text;
begin
  select role into invited_role from public.pending_invites where email = new.email;

  if invited_role is not null then
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      invited_role
    )
    on conflict (id) do nothing;

    delete from public.pending_invites where email = new.email;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- backfill: only for auth.users rows that already exist AND match a pending
-- invite by email (covers people who logged in before this table existed).
-- Anyone else who already logged in without an invite stays profile-less.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  pi.role
from auth.users u
join public.pending_invites pi on pi.email = u.email
on conflict (id) do nothing;

delete from public.pending_invites
where email in (select email from public.profiles);

-- 2. enable RLS -----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.evaluations enable row level security;
alter table public.vendors enable row level security;
alter table public.evaluators enable row level security;
alter table public.evf_criteria enable row level security;
alter table public.evaluated_items enable row level security;

-- 3. profiles policies ------------------------------------------------------
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. evaluations + child tables ---------------------------------------------
-- No policies for `anon`: the public /eval/[id] link goes through server-side
-- API routes using the service_role key, which bypasses RLS entirely.
-- Any authenticated user (admin or specialist) may read everything.
do $$
declare
  t text;
begin
  foreach t in array array['evaluations', 'vendors', 'evaluators', 'evf_criteria', 'evaluated_items']
  loop
    execute format('drop policy if exists "authenticated can read" on public.%I', t);
    execute format(
      'create policy "authenticated can read" on public.%I for select to authenticated using (true)',
      t
    );

    execute format('drop policy if exists "admin and specialist can write" on public.%I', t);
    execute format(
      'create policy "admin and specialist can write" on public.%I for insert to authenticated with check (true)',
      t
    );

    execute format('drop policy if exists "admin and specialist can update" on public.%I', t);
    execute format(
      'create policy "admin and specialist can update" on public.%I for update to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Only admin can permanently delete.
drop policy if exists "admin can delete" on public.evaluations;
create policy "admin can delete" on public.evaluations
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin can delete" on public.vendors;
create policy "admin can delete" on public.vendors
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin can delete" on public.evaluators;
create policy "admin can delete" on public.evaluators
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin can delete" on public.evf_criteria;
create policy "admin can delete" on public.evf_criteria
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin can delete" on public.evaluated_items;
create policy "admin can delete" on public.evaluated_items
  for delete to authenticated using (public.is_admin());

-- 5. seed the first admin --------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'your-email@yourdomain.com';
