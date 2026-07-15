-- ============================================================================
-- EthioPayroll — Full Supabase Setup
-- ============================================================================
-- Run this ENTIRE file once, in the Supabase SQL Editor, on a fresh project.
-- It is safe to re-run: every statement is guarded with IF NOT EXISTS /
-- CREATE OR REPLACE, so re-running will not duplicate data or error out.
--
-- What this creates:
--   1. companies              — one row per tenant (multi-tenant from day 1)
--   2. profiles               — links a Supabase auth user to a company + role
--   3. employees               — permanent staff records
--   4. contractors             — non-payroll contractors, paid per invoice
--   5. payroll_runs            — one row per monthly payroll cycle
--   6. payslips                — one row per employee per payroll run
--   7. leave_requests          — leave/PTO requests and approvals
--   8. overtime_entries        — logged overtime hours pending payroll
--   9. offer_letters           — generated offer letters
--  10. portal_tokens           — single-use / expiring tokens for the
--                                employee self-service portal (no login needed)
--  11. audit_log               — append-only trail of sensitive actions
--
-- Security model:
--   Row Level Security (RLS) is ON for every table. A user can only ever
--   read or write rows belonging to their own company_id, which is resolved
--   through profiles.company_id — never trusted from client input.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. companies
-- ----------------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tin text,                          -- Ethiopian Taxpayer Identification Number
  address text,
  city text default 'Addis Ababa',
  phone text,
  logo_url text,
  pension_scheme text default 'private', -- 'private' or 'government'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. profiles  (one per auth.users row)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin','hr','finance','viewer')),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_company on profiles(company_id);

-- ----------------------------------------------------------------------------
-- 3. employees
-- ----------------------------------------------------------------------------
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_code text,                -- internal ID, e.g. EMP-0007
  full_name text not null,
  email text,
  phone text,
  tin text,                          -- employee's personal TIN
  position text,
  department text,
  employment_type text default 'permanent' check (employment_type in ('permanent','contract','probation')),
  start_date date,
  end_date date,
  basic_salary numeric(14,2) not null default 0,
  transport_allowance numeric(14,2) not null default 0,
  housing_allowance numeric(14,2) not null default 0,
  other_allowance numeric(14,2) not null default 0,
  bank_name text,
  bank_account text,
  pension_number text,
  status text not null default 'active' check (status in ('active','on_leave','terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_company on employees(company_id);
create index if not exists idx_employees_status on employees(company_id, status);

-- ----------------------------------------------------------------------------
-- 4. contractors
-- ----------------------------------------------------------------------------
create table if not exists contractors (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  company_name text,                 -- if contracting via their own business
  email text,
  phone text,
  tin text,
  service_description text,
  rate numeric(14,2) not null default 0,
  rate_type text not null default 'fixed' check (rate_type in ('fixed','hourly','per_project')),
  withholding_tax_rate numeric(5,2) not null default 2.00, -- ERCA default withholding %
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contractors_company on contractors(company_id);

-- ----------------------------------------------------------------------------
-- 5. payroll_runs
-- ----------------------------------------------------------------------------
create table if not exists payroll_runs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  status text not null default 'draft' check (status in ('draft','finalized','paid')),
  run_date date not null default current_date,
  total_gross numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  total_tax numeric(14,2) not null default 0,
  total_pension numeric(14,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (company_id, period_month, period_year)
);

create index if not exists idx_payroll_runs_company on payroll_runs(company_id);

-- ----------------------------------------------------------------------------
-- 6. payslips
-- ----------------------------------------------------------------------------
create table if not exists payslips (
  id uuid primary key default uuid_generate_v4(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  basic_salary numeric(14,2) not null default 0,
  transport_allowance numeric(14,2) not null default 0,
  housing_allowance numeric(14,2) not null default 0,
  other_allowance numeric(14,2) not null default 0,
  overtime_pay numeric(14,2) not null default 0,
  gross_salary numeric(14,2) not null default 0,
  taxable_income numeric(14,2) not null default 0,
  income_tax numeric(14,2) not null default 0,     -- ERCA progressive schedule
  pension_employee numeric(14,2) not null default 0, -- 7% employee contribution
  pension_employer numeric(14,2) not null default 0, -- 11% employer contribution
  other_deductions numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_payslips_run on payslips(payroll_run_id);
create index if not exists idx_payslips_employee on payslips(employee_id);
create index if not exists idx_payslips_company on payslips(company_id);

-- ----------------------------------------------------------------------------
-- 7. leave_requests
-- ----------------------------------------------------------------------------
create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null default 'annual' check (leave_type in ('annual','sick','maternity','paternity','unpaid','other')),
  start_date date not null,
  end_date date not null,
  days_requested numeric(5,1) not null default 0,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_leave_company on leave_requests(company_id);
create index if not exists idx_leave_employee on leave_requests(employee_id);

-- ----------------------------------------------------------------------------
-- 8. overtime_entries
-- ----------------------------------------------------------------------------
create table if not exists overtime_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  hours numeric(5,2) not null default 0,
  rate_multiplier numeric(4,2) not null default 1.5, -- 1.5x weekday, 2x rest day, 2.5x public holiday per Ethiopian labor law
  ot_type text not null default 'weekday' check (ot_type in ('weekday','rest_day','public_holiday','night')),
  status text not null default 'pending' check (status in ('pending','approved','paid')),
  payroll_run_id uuid references payroll_runs(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_overtime_company on overtime_entries(company_id);
create index if not exists idx_overtime_employee on overtime_entries(employee_id);
create index if not exists idx_overtime_run on overtime_entries(payroll_run_id);

-- ----------------------------------------------------------------------------
-- 9. offer_letters
-- ----------------------------------------------------------------------------
create table if not exists offer_letters (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  candidate_name text not null,
  position text not null,
  department text,
  start_date date,
  basic_salary numeric(14,2) not null default 0,
  employment_type text default 'permanent' check (employment_type in ('permanent','contract','probation')),
  probation_months int default 0,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
  letter_body text,                 -- final rendered letter text, for record-keeping
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_offer_letters_company on offer_letters(company_id);

-- ----------------------------------------------------------------------------
-- 10. portal_tokens  (employee self-service portal, no separate login)
-- ----------------------------------------------------------------------------
create table if not exists portal_tokens (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,        -- random opaque token, generated server-side
  employee_id uuid not null references employees(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_tokens_token on portal_tokens(token);
create index if not exists idx_portal_tokens_employee on portal_tokens(employee_id);

-- ----------------------------------------------------------------------------
-- 11. audit_log  (append-only; never updated or deleted by the app)
-- ----------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,               -- e.g. 'payroll.finalize', 'employee.create'
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_company on audit_log(company_id);
create index if not exists idx_audit_created on audit_log(created_at desc);

-- ----------------------------------------------------------------------------
-- 12. team_invites  (lets an admin add a teammate to their EXISTING company —
--     mirrors portal_tokens: a random opaque token is the credential)
-- ----------------------------------------------------------------------------
create table if not exists team_invites (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  company_id uuid not null references companies(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin','hr','finance','viewer')),
  created_by uuid references profiles(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_invites_token on team_invites(token);
create index if not exists idx_team_invites_company on team_invites(company_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Helpers resolve the caller's company_id / role from their OWN profile row.
-- SECURITY DEFINER so they can read profiles regardless of the caller's own
-- RLS grants, but they take no argument a client could use to ask about
-- someone else — they only ever answer "who is the caller".
-- search_path is pinned (Supabase security-linter best practice) so these
-- can't be tricked by a session-local search_path pointing at a shadow table.
-- ============================================================================

create or replace function auth_company_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function auth_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select role from profiles where id = auth.uid()
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table employees enable row level security;
alter table contractors enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table leave_requests enable row level security;
alter table overtime_entries enable row level security;
alter table offer_letters enable row level security;
alter table portal_tokens enable row level security;
alter table team_invites enable row level security;
alter table audit_log enable row level security;

-- companies: any company member may read; only 'admin' may update
-- (there is deliberately NO insert policy — a company row can only ever be
-- created through the create_company_and_profile() function below, so a
-- client can never insert a row that has no matching, legitimate profile).
drop policy if exists "company_select" on companies;
create policy "company_select" on companies for select
  using (id = auth_company_id());

drop policy if exists "company_update" on companies;
create policy "company_update" on companies for update
  using (id = auth_company_id() and auth_role() = 'admin')
  with check (id = auth_company_id());

-- profiles: a user may see profiles in their own company. Updates are split
-- in two: you may always update your OWN row (e.g. your name), and an admin
-- may update ANY row in their own company (e.g. to change someone's role).
-- Critically, there is NO insert policy at all — profiles can only be
-- created via create_company_and_profile() or accept_team_invite() below.
-- Previously this table had a "with check (id = auth.uid())" insert policy,
-- which only checked that you were inserting a row for YOURSELF — it never
-- checked that company_id pointed at a company you had any right to join,
-- so anyone could insert {id: self, company_id: <any company>, role:
-- 'admin'} and grant themselves admin access to a company that wasn't
-- theirs. Routing creation through a SECURITY DEFINER function closes that.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (company_id = auth_company_id());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles for update
  using (company_id = auth_company_id() and auth_role() = 'admin')
  with check (company_id = auth_company_id());

drop policy if exists "profiles_insert_self" on profiles;

-- Belt-and-suspenders: even though the two update policies above are the
-- only way to reach an UPDATE at all, a trigger blocks the two most
-- sensitive columns outright unless the actor is an admin — so a future
-- change to the policies above (or a bug in them) can't silently reopen
-- the self-escalation hole this was built to close.
create or replace function prevent_unsafe_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot be changed after a profile is created.';
  end if;
  if new.role is distinct from old.role and auth_role() <> 'admin' then
    raise exception 'Only an admin can change a member''s role.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_unsafe_profile_changes on profiles;
create trigger trg_prevent_unsafe_profile_changes
  before update on profiles
  for each row execute function prevent_unsafe_profile_changes();

-- Generic tenant-isolation policy, repeated per table: everyone in the
-- company can READ; only non-'viewer' roles can write. 'viewer' really
-- does mean view-only now, at the database level, not just a disabled
-- button in the UI.

drop policy if exists "employees_all" on employees;
drop policy if exists "employees_select" on employees;
create policy "employees_select" on employees for select
  using (company_id = auth_company_id());
drop policy if exists "employees_write" on employees;
create policy "employees_write" on employees for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "contractors_all" on contractors;
drop policy if exists "contractors_select" on contractors;
create policy "contractors_select" on contractors for select
  using (company_id = auth_company_id());
drop policy if exists "contractors_write" on contractors;
create policy "contractors_write" on contractors for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "payroll_runs_all" on payroll_runs;
drop policy if exists "payroll_runs_select" on payroll_runs;
create policy "payroll_runs_select" on payroll_runs for select
  using (company_id = auth_company_id());
drop policy if exists "payroll_runs_write" on payroll_runs;
create policy "payroll_runs_write" on payroll_runs for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "payslips_all" on payslips;
drop policy if exists "payslips_select" on payslips;
create policy "payslips_select" on payslips for select
  using (company_id = auth_company_id());
drop policy if exists "payslips_write" on payslips;
create policy "payslips_write" on payslips for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "leave_requests_all" on leave_requests;
drop policy if exists "leave_requests_select" on leave_requests;
create policy "leave_requests_select" on leave_requests for select
  using (company_id = auth_company_id());
drop policy if exists "leave_requests_write" on leave_requests;
create policy "leave_requests_write" on leave_requests for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "overtime_entries_all" on overtime_entries;
drop policy if exists "overtime_entries_select" on overtime_entries;
create policy "overtime_entries_select" on overtime_entries for select
  using (company_id = auth_company_id());
drop policy if exists "overtime_entries_write" on overtime_entries;
create policy "overtime_entries_write" on overtime_entries for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

drop policy if exists "offer_letters_all" on offer_letters;
drop policy if exists "offer_letters_select" on offer_letters;
create policy "offer_letters_select" on offer_letters for select
  using (company_id = auth_company_id());
drop policy if exists "offer_letters_write" on offer_letters;
create policy "offer_letters_write" on offer_letters for all
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');

-- portal_tokens: INSERT/UPDATE only (to generate or revoke a link) — there
-- is deliberately NO select policy, so no authenticated client can list or
-- read back raw token strings, even for their own company. (Previously a
-- "for all" policy accidentally granted select too, contradicting this
-- table's own comment — any signed-in user, including a 'viewer', could
-- have queried this table directly and read out live access tokens to
-- every employee's payslip data.) The employee portal itself reaches these
-- rows only through the server-side API route using the service role key.
drop policy if exists "portal_tokens_company_admin" on portal_tokens;
drop policy if exists "portal_tokens_insert" on portal_tokens;
create policy "portal_tokens_insert" on portal_tokens for insert
  with check (company_id = auth_company_id() and auth_role() <> 'viewer');
drop policy if exists "portal_tokens_update" on portal_tokens;
create policy "portal_tokens_update" on portal_tokens for update
  using (company_id = auth_company_id() and auth_role() <> 'viewer')
  with check (company_id = auth_company_id());

-- team_invites: admins generate them, and — like portal_tokens — nobody
-- can SELECT the raw token back out through the normal client. The invite
-- link is shown once, at creation time, in the response of the insert.
drop policy if exists "team_invites_insert" on team_invites;
create policy "team_invites_insert" on team_invites for insert
  with check (company_id = auth_company_id() and auth_role() = 'admin');
drop policy if exists "team_invites_update" on team_invites;
create policy "team_invites_update" on team_invites for update
  using (company_id = auth_company_id() and auth_role() = 'admin')
  with check (company_id = auth_company_id());

-- audit_log: readable by company members, but INSERT is the only write
-- allowed from the client — no update or delete policy exists at all,
-- which makes the log append-only by construction.
drop policy if exists "audit_log_select" on audit_log;
create policy "audit_log_select" on audit_log for select
  using (company_id = auth_company_id());

drop policy if exists "audit_log_insert" on audit_log;
create policy "audit_log_insert" on audit_log for insert
  with check (company_id = auth_company_id());

-- ============================================================================
-- ACCOUNT CREATION — the only two ways a profiles row can ever come into
-- existence. Both are SECURITY DEFINER so they can bypass RLS internally,
-- but each is narrowly scoped to exactly one legitimate action.
-- ============================================================================

-- create_company_and_profile: the "sign up and found a new company" path.
-- Only works if the caller doesn't already have a profile — so an existing
-- user can't call this to spin up (and become admin of) extra companies.
create or replace function create_company_and_profile(p_company_name text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account already belongs to a company.';
  end if;

  if coalesce(trim(p_company_name), '') = '' then
    raise exception 'Company name is required.';
  end if;

  insert into companies (name) values (trim(p_company_name))
  returning id into new_company_id;

  insert into profiles (id, company_id, full_name, role)
  values (auth.uid(), new_company_id, coalesce(nullif(trim(p_full_name), ''), 'Admin'), 'admin');

  return new_company_id;
end;
$$;

grant execute on function create_company_and_profile(text, text) to authenticated;

-- accept_team_invite: the "join an EXISTING company via a link an admin
-- generated" path. Validates the token exactly like the portal route does
-- (exists, not expired) and is equally strict that the caller has no
-- profile yet, so an invite can only ever seat a brand-new team member.
create or replace function accept_team_invite(p_token text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite team_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account already belongs to a company.';
  end if;

  select * into invite from team_invites where token = p_token;

  if invite.id is null then
    raise exception 'This invite link is invalid.';
  end if;
  if invite.used_at is not null then
    raise exception 'This invite link has already been used.';
  end if;
  if invite.expires_at < now() then
    raise exception 'This invite link has expired.';
  end if;

  insert into profiles (id, company_id, full_name, role)
  values (auth.uid(), invite.company_id, coalesce(nullif(trim(p_full_name), ''), 'Team member'), invite.role);

  update team_invites set used_at = now(), used_by = auth.uid() where id = invite.id;

  return invite.company_id;
end;
$$;

grant execute on function accept_team_invite(text, text) to authenticated;

-- ============================================================================
-- Done. Twelve tables, all indexed, all RLS-protected, roles actually
-- enforced (not just displayed), account creation routed through two
-- narrow, auditable entry points instead of open client-side inserts.
-- ============================================================================
