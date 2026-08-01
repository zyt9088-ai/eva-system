-- Roles + RLS for نظام قيّم
-- Safe to re-run: every statement is idempotent (create-if-not-exists / drop-if-exists / create-or-replace).

-- 1. profiles table -----------------------------------------------------
-- Every authenticated @mngdp.com user gets a row here (see handle_new_user
-- below). Role defaults to 'employee' unless pre-invited as admin/specialist.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'specialist', 'employee')),
  created_at timestamptz not null default now()
);

-- widen the allowed roles if this table already existed from an earlier run
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'specialist', 'employee'));
alter table public.profiles alter column role set default 'employee';

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
-- Lets an admin pre-assign an elevated role (admin/specialist) to an
-- @mngdp.com email BEFORE that person ever signs in. Consumed automatically
-- on first login. Anyone NOT pre-invited still gets in, just as 'employee'.
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

-- Whenever a new user signs in via Azure: always create a profile. Uses the
-- pre-invited role if one exists, otherwise defaults to 'employee' — anyone
-- in the organization can log in, just scoped to their permissions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invited_role text;
begin
  select role into invited_role from public.pending_invites where email = new.email;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(invited_role, 'employee')
  )
  on conflict (id) do nothing;

  delete from public.pending_invites where email = new.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- backfill: create a profile for every existing auth.users row that doesn't
-- have one yet (covers anyone who logged in before this migration existed,
-- including the old invite-only version that skipped uninvited accounts).
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(pi.role, 'employee')
from auth.users u
left join public.pending_invites pi on pi.email = u.email
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
-- Child tables stay readable by any authenticated user — employees need
-- this to find evaluations where they're listed as an evaluator (matched by
-- email at query time in /my-tasks). `evaluations` itself is isolated by
-- creator below instead of the same blanket policy.
do $$
declare
  t text;
begin
  foreach t in array array['evaluations', 'vendors', 'evaluators', 'evf_criteria', 'evaluated_items']
  loop
    if t <> 'evaluations' then
      execute format('drop policy if exists "authenticated can read" on public.%I', t);
      execute format(
        'create policy "authenticated can read" on public.%I for select to authenticated using (true)',
        t
      );
    end if;

    execute format('drop policy if exists "admin and specialist can write" on public.%I', t);
    execute format(
      'create policy "admin and specialist can write" on public.%I for insert to authenticated with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = ''specialist''))',
      t
    );

    execute format('drop policy if exists "admin and specialist can update" on public.%I', t);
    execute format(
      'create policy "admin and specialist can update" on public.%I for update to authenticated using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = ''specialist'')) with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = ''specialist''))',
      t
    );
  end loop;
end $$;

-- Requests are isolated by owner: admin sees everything, specialist sees
-- only what they created. Anyone (any role) whose email matches an
-- evaluator on the request can still read it — needed for /my-tasks, and
-- for an admin/specialist who's themselves listed as a committee member.
alter table public.evaluations add column if not exists created_by uuid references auth.users (id) on delete set null;

drop policy if exists "authenticated can read" on public.evaluations;
drop policy if exists "role scoped read" on public.evaluations;
create policy "role scoped read" on public.evaluations
  for select to authenticated using (
    public.is_admin()
    or (
      created_by = auth.uid()
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist')
    )
    or exists (
      select 1 from public.evaluators e
      join public.profiles p on p.id = auth.uid()
      where e.evaluation_id = evaluations.id
        and e.email = p.email
    )
  );

-- Only admin can permanently delete a whole evaluation request.
drop policy if exists "admin can delete" on public.evaluations;
create policy "admin can delete" on public.evaluations
  for delete to authenticated using (public.is_admin());

-- Child rows (vendors/evaluators/criteria/items) can be deleted by admin OR
-- specialist, because editing a request replaces these rows (delete +
-- re-insert) — this is NOT the same as permanently deleting a request.
do $$
declare
  t text;
begin
  foreach t in array array['vendors', 'evaluators', 'evf_criteria', 'evaluated_items']
  loop
    execute format('drop policy if exists "admin can delete" on public.%I', t);
    execute format('drop policy if exists "admin and specialist can delete" on public.%I', t);
    execute format(
      'create policy "admin and specialist can delete" on public.%I for delete to authenticated using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = ''specialist''))',
      t
    );
  end loop;
end $$;

-- 6. employee directory ----------------------------------------------------
-- Admin-maintained directory of organization staff (name/phone/department/
-- email), used to search-select evaluators when creating an evaluation
-- request instead of typing names manually. Read is open to any
-- authenticated user (specialists need it for the picker); writes (manual
-- edits or bulk import) are admin-only.
create table if not exists public.employee_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  department text,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.employee_directory enable row level security;

drop policy if exists "authenticated can read directory" on public.employee_directory;
create policy "authenticated can read directory" on public.employee_directory
  for select to authenticated using (true);

drop policy if exists "admin manages directory" on public.employee_directory;
create policy "admin manages directory" on public.employee_directory
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7. vendor attachment storage ----------------------------------------------
-- Vendor proposal PDFs uploaded during create/edit. attachment_path is the
-- storage object key (independent of the vendor row's id, so it survives
-- edit's delete+reinsert cycle for vendors).
alter table public.vendors add column if not exists attachment_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-attachments', 'vendor-attachments', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;

-- storage.objects already has RLS enabled by default in every Supabase
-- project, and the SQL editor's role doesn't own that table — don't try to
-- toggle it here (fails with "must be owner of table objects").

-- admin/specialist upload; readable by admin/specialist or anyone whose
-- email matches an evaluator on the evaluation the file belongs to (path is
-- "{evaluation_id}/{uuid}.pdf", so the first path segment is the evaluation id).
drop policy if exists "staff can upload vendor attachments" on storage.objects;
create policy "staff can upload vendor attachments" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'vendor-attachments'
    and (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist'))
  );

drop policy if exists "staff can delete vendor attachments" on storage.objects;
create policy "staff can delete vendor attachments" on storage.objects
  for delete to authenticated using (
    bucket_id = 'vendor-attachments'
    and (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist'))
  );

drop policy if exists "org can read vendor attachments" on storage.objects;
create policy "org can read vendor attachments" on storage.objects
  for select to authenticated using (
    bucket_id = 'vendor-attachments'
    and (
      public.is_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist')
      or exists (
        select 1 from public.evaluators e
        join public.profiles p on p.id = auth.uid()
        where e.evaluation_id::text = (storage.foldername(name))[1]
          and e.email = p.email
      )
    )
  );

-- 5. seed the first admin --------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'your-email@yourdomain.com';
