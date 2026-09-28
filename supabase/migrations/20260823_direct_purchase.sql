-- ============================================================================
-- Migration: Direct Purchase Module (نظام الشراء المباشر)
-- Idempotent script for Supabase SQL Editor
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. Committee Members Master Table (أعضاء لجنة الشراء المباشر الدائمين)
create table if not exists public.direct_purchase_committee (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null,
  created_at timestamptz not null default now()
);

-- Drop role check constraint if it was created previously
alter table public.direct_purchase_committee drop constraint if exists direct_purchase_committee_role_check;

alter table public.direct_purchase_committee enable row level security;

drop policy if exists "authenticated can read committee" on public.direct_purchase_committee;
create policy "authenticated can read committee" on public.direct_purchase_committee
  for select to authenticated using (true);

drop policy if exists "admin manages committee" on public.direct_purchase_committee;
create policy "admin manages committee" on public.direct_purchase_committee
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 1b. Executive Approvers Master Table (المدير العام التنفيذي ونوابه) ----------
-- The final approval no longer sits with مدير المشتريات: every request — whether
-- it went to the committee or not — ends with the executive director signing
-- it, and مدير المشتريات closes it afterwards. This roster works exactly like
-- the committee table above, and must be declared before the request policies
-- in section 2, which reference it.
create table if not exists public.direct_purchase_executives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'executive',
  -- Exactly one row carries this at a time (see the trigger below), so a
  -- deputy can stand in while the director is away without two people holding
  -- the signature at once.
  is_active_approver boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.direct_purchase_executives
  add column if not exists is_active_approver boolean not null default false;

alter table public.direct_purchase_executives drop constraint if exists direct_purchase_executives_role_check;
alter table public.direct_purchase_executives add constraint direct_purchase_executives_role_check
  check (role in ('executive', 'vice_executive'));

alter table public.direct_purchase_executives enable row level security;

drop policy if exists "authenticated can read executives" on public.direct_purchase_executives;
create policy "authenticated can read executives" on public.direct_purchase_executives
  for select to authenticated using (true);

drop policy if exists "admin manages executives" on public.direct_purchase_executives;
create policy "admin manages executives" on public.direct_purchase_executives
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Flipping the flag on one row clears it everywhere else, so the notification
-- and the approve button always have exactly one owner. The cascading update
-- only ever sets the flag to false, so the trigger doesn't re-fire into a loop.
create or replace function public.enforce_single_active_executive()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_active_approver then
    update public.direct_purchase_executives
      set is_active_approver = false
      where id <> new.id and is_active_approver;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_active_executive on public.direct_purchase_executives;
create trigger enforce_single_active_executive
  after insert or update of is_active_approver on public.direct_purchase_executives
  for each row execute function public.enforce_single_active_executive();

-- 2. Direct Purchase Requests Table (طلبات مبرر الشراء المباشر)
create table if not exists public.direct_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  pr_number text,
  created_by uuid references auth.users(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  department text,
  request_title text not null,
  estimated_cost numeric not null default 0,
  reason_type text not null,
  scope_of_work text not null,
  justification_reason text not null,
  impact_if_rejected text not null,
  vendor_name text not null,
  vendor_contact_person text,
  vendor_contact_phone text,
  vendor_contact_email text,
  attachments jsonb default '[]'::jsonb,
  
  -- Department Manager stage
  dept_manager_name text,
  dept_manager_email text not null,
  dept_manager_approval_status text default 'pending',
  dept_manager_approval_date timestamptz,
  dept_manager_declaration text,
  dept_manager_notes text,
  
  -- Procurement Specialist stage
  assigned_specialist_id uuid references auth.users(id) on delete set null,
  assigned_specialist_name text,
  assigned_specialist_email text,
  specialist_checklist jsonb default '{}'::jsonb,
  specialist_declaration text,
  specialist_review_date timestamptz,
  specialist_action text,
  specialist_notes text,
  
  -- Committee stage
  intake_method text,
  budget_amount numeric,
  committee_overview text,
  committee_recommendation text,
  committee_recommendation_reasons text,
  committee_attendees jsonb default '[]'::jsonb,
  committee_submitted_at timestamptz,
  committee_completed_at timestamptz,
  
  -- Overall status & Admin final approval
  status text not null default 'pending_dept_manager',
  admin_approval_date timestamptz,
  admin_notes text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.direct_purchase_requests add column if not exists pr_number text;

alter table public.direct_purchase_requests enable row level security;

drop policy if exists "direct purchase select policy" on public.direct_purchase_requests;
create policy "direct purchase select policy" on public.direct_purchase_requests
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist')
    or created_by = auth.uid()
    or dept_manager_email = (select email from public.profiles where id = auth.uid())
    or exists (
      select 1 from jsonb_array_elements(committee_attendees) as att
      where att->>'email' = (select email from public.profiles where id = auth.uid())
    )
    -- The executive director (and their deputies) sign the final approval, so
    -- they must be able to open any request — see section 5.
    or exists (
      select 1 from public.direct_purchase_executives x
      where x.email = (select email from public.profiles where id = auth.uid())
    )
  );

drop policy if exists "direct purchase insert policy" on public.direct_purchase_requests;
create policy "direct purchase insert policy" on public.direct_purchase_requests
  for insert to authenticated with check (true);

drop policy if exists "direct purchase update policy" on public.direct_purchase_requests;
create policy "direct purchase update policy" on public.direct_purchase_requests
  for update to authenticated using (true) with check (true);

drop policy if exists "admin can delete direct purchase" on public.direct_purchase_requests;
create policy "admin can delete direct purchase" on public.direct_purchase_requests
  for delete to authenticated using (public.is_admin());

-- 3. Direct purchase attachment storage --------------------------------------
-- Supporting PDFs (quotations, sole-source letters, ...) used to be stored as
-- base64 data URLs inside direct_purchase_requests.attachments, which bloated
-- every row. They now live in this bucket, and the jsonb column only keeps the
-- metadata: [{ name, size, path }] where path is "{request_id}/{uuid}.pdf".
-- 31457280 bytes = 30 MB — kept in sync with MAX_SIZE in the create/edit modals.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('direct-purchase-attachments', 'direct-purchase-attachments', false, 31457280, array['application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;

-- storage.objects already has RLS enabled by default in every Supabase
-- project, and the SQL editor's role doesn't own that table — don't try to
-- toggle it here (fails with "must be owner of table objects").

-- Upload is open to any authenticated user, mirroring the request insert
-- policy above (`with check (true)`) — anyone who may raise a direct purchase
-- request may attach files to it.
drop policy if exists "authenticated can upload direct purchase attachments" on storage.objects;
create policy "authenticated can upload direct purchase attachments" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'direct-purchase-attachments'
  );

-- Read/delete piggyback on the request's own select policy: the subquery runs
-- as the caller, so a file is only reachable by someone who can already see
-- the request it belongs to (admin, specialist, creator, dept manager or a
-- committee attendee). The path's first segment is the request id, and it must
-- be written as storage.objects.name — `name` alone is ambiguous inside the
-- subquery.
drop policy if exists "org can read direct purchase attachments" on storage.objects;
create policy "org can read direct purchase attachments" on storage.objects
  for select to authenticated using (
    bucket_id = 'direct-purchase-attachments'
    and exists (
      select 1 from public.direct_purchase_requests r
      where r.id::text = (storage.foldername(objects.name))[1]
    )
  );

drop policy if exists "owner can delete direct purchase attachments" on storage.objects;
create policy "owner can delete direct purchase attachments" on storage.objects
  for delete to authenticated using (
    bucket_id = 'direct-purchase-attachments'
    and exists (
      select 1 from public.direct_purchase_requests r
      where r.id::text = (storage.foldername(objects.name))[1]
        and (
          public.is_admin()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'specialist')
          or r.created_by = auth.uid()
        )
    )
  );

-- 4. Formal committee minutes header ------------------------------------------
-- The minutes are a formal record, so they carry their own reference number,
-- meeting date and venue rather than borrowing the submission timestamp.
alter table public.direct_purchase_requests add column if not exists committee_minutes_number text;
alter table public.direct_purchase_requests add column if not exists committee_meeting_date date;
alter table public.direct_purchase_requests add column if not exists committee_meeting_place text;

-- 5. Executive approval + closure (اعتماد المدير العام التنفيذي ثم الإقفال) -----
-- Two stages were appended to the end of every route. The executive director
-- (or the standing deputy — see section 1b) reviews the whole file and signs
-- it; مدير المشتريات then closes the request. Both signatures are reproduced in
-- the printed report, so each one records who signed, in what capacity and when.
alter table public.direct_purchase_requests add column if not exists executive_approver_name text;
alter table public.direct_purchase_requests add column if not exists executive_approver_email text;
alter table public.direct_purchase_requests add column if not exists executive_approver_role text;
alter table public.direct_purchase_requests add column if not exists executive_decision text;
alter table public.direct_purchase_requests add column if not exists executive_approval_date timestamptz;
alter table public.direct_purchase_requests add column if not exists executive_declaration text;
alter table public.direct_purchase_requests add column if not exists executive_notes text;

alter table public.direct_purchase_requests add column if not exists closed_by_name text;
alter table public.direct_purchase_requests add column if not exists closed_by_email text;
alter table public.direct_purchase_requests add column if not exists closure_date timestamptz;
alter table public.direct_purchase_requests add column if not exists closure_notes text;

alter table public.direct_purchase_requests drop constraint if exists direct_purchase_requests_executive_decision_check;
alter table public.direct_purchase_requests add constraint direct_purchase_requests_executive_decision_check
  check (executive_decision is null or executive_decision in ('approved', 'rejected'));

-- 'pending_admin_approval' is retired: مدير المشتريات no longer signs the final
-- approval. Anything still parked there moves to the executive's queue. Safe to
-- re-run — after the first pass no row matches.
update public.direct_purchase_requests
  set status = 'pending_executive_approval'
  where status = 'pending_admin_approval';
