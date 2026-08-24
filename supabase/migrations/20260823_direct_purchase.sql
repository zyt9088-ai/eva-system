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
