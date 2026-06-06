create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type public.app_role as enum ('admin', 'data_entry', 'doctor', 'specialist');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.staff_role as enum ('doctor', 'specialist');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('cash', 'card', 'transfer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.operation_status as enum ('completed', 'pending_assignment', 'scheduled', 'pending_payment', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.booking_status as enum ('scheduled', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.purchase_order_status as enum ('planned', 'ordered', 'received', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.salary_status as enum ('draft', 'approved', 'paid');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  phone text,
  email citext,
  address text,
  city text,
  country text not null default 'Jordan',
  default_branch text not null default 'الفرع الرئيسي',
  timezone text not null default 'Asia/Amman',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  role public.staff_role not null,
  rate numeric(6,2) not null default 0 check (rate >= 0 and rate <= 100),
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  deduction numeric(12,2) not null default 0 check (deduction >= 0),
  phone text,
  email citext,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  email citext,
  name text not null,
  role public.app_role not null default 'data_entry',
  allowed_views text[] not null default array['entries']::text[],
  can_view_sensitive boolean not null default false,
  own_entries_only boolean not null default false,
  can_manage_permissions boolean not null default false,
  active boolean not null default true,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clinic_members_user_idx
  on public.clinic_members (clinic_id, user_id)
  where user_id is not null;

create unique index if not exists clinic_members_email_idx
  on public.clinic_members (clinic_id, email)
  where email is not null;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  default_cost numeric(12,2) not null default 0 check (default_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  applies_to public.staff_role not null,
  person_id uuid references public.staff(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  model text not null default 'member_rate' check (model in ('member_rate', 'pct_net', 'pct_gross', 'fixed', 'tiered')),
  value numeric(12,2) not null default 0 check (value >= 0),
  tier_threshold numeric(12,2) not null default 0 check (tier_threshold >= 0),
  tier_value numeric(12,2) not null default 0 check (tier_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  doctor_id uuid references public.staff(id) on delete set null,
  specialist_id uuid references public.staff(id) on delete set null,
  booking_date date not null,
  booking_time time not null,
  patient_name text not null,
  patient_phone text,
  expected_amount numeric(12,2) not null default 0 check (expected_amount >= 0),
  status public.booking_status not null default 'scheduled',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_has_valid_team check (
    doctor_id is null
    or specialist_id is null
    or doctor_id <> specialist_id
  )
);

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  doctor_id uuid references public.staff(id) on delete set null,
  specialist_id uuid references public.staff(id) on delete set null,
  operation_date date not null,
  patient_name text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  net_amount numeric(12,2) generated always as (greatest(gross_amount - discount, 0)) stored,
  direct_cost numeric(12,2) not null default 0 check (direct_cost >= 0),
  profit_amount numeric(12,2) generated always as (greatest(gross_amount - discount - direct_cost, 0)) stored,
  payment_method public.payment_method not null default 'cash',
  status public.operation_status not null default 'completed',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_discount_lte_gross check (discount <= gross_amount),
  constraint operation_has_valid_team check (
    doctor_id is null
    or specialist_id is null
    or doctor_id <> specialist_id
  )
);

create table if not exists public.operation_payouts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  role_in_operation public.staff_role not null,
  formula text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (operation_id, staff_id)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  contact text,
  city text,
  category text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text,
  unit text not null default 'قطعة',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  low_threshold numeric(12,2) not null default 0 check (low_threshold >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  last_ordered_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  item_id uuid references public.inventory_items(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  order_date date not null,
  quantity numeric(12,2) not null default 0 check (quantity > 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  total_cost numeric(12,2) generated always as (quantity * unit_cost) stored,
  branch text,
  status public.purchase_order_status not null default 'ordered',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  work_date date not null,
  counted_cash numeric(12,2) not null default 0 check (counted_cash >= 0),
  counted_card numeric(12,2) not null default 0 check (counted_card >= 0),
  counted_transfer numeric(12,2) not null default 0 check (counted_transfer >= 0),
  notes text,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, work_date)
);

create table if not exists public.salary_slips (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  operations_count integer not null default 0 check (operations_count >= 0),
  gross_revenue numeric(12,2) not null default 0 check (gross_revenue >= 0),
  direct_cost numeric(12,2) not null default 0 check (direct_cost >= 0),
  payout_amount numeric(12,2) not null default 0 check (payout_amount >= 0),
  status public.salary_status not null default 'draft',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_slip_period_valid check (period_start <= period_end),
  unique (clinic_id, staff_id, period_start, period_end)
);

create table if not exists public.salary_slip_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  salary_slip_id uuid not null references public.salary_slips(id) on delete cascade,
  operation_id uuid references public.operations(id) on delete set null,
  patient_name text not null,
  service_name text not null,
  role_in_operation public.staff_role not null,
  net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  direct_cost numeric(12,2) not null default 0 check (direct_cost >= 0),
  formula text not null,
  payout_amount numeric(12,2) not null default 0 check (payout_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clinic text not null,
  phone text not null,
  city text not null,
  plan text not null,
  clinic_size text,
  notes text,
  source text not null default 'landing',
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_number text not null,
  profile_type text not null default 'patient' check (profile_type in ('patient', 'visitor')),
  full_name text not null,
  phone text,
  email citext,
  gender text,
  nationality text,
  city text,
  category text,
  notes text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, patient_number)
);

alter table public.bookings
  add column if not exists patient_id uuid references public.patients(id) on delete set null;

alter table public.operations
  add column if not exists patient_id uuid references public.patients(id) on delete set null;

alter table public.operations
  add column if not exists visit_id text;

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  member_id uuid references public.clinic_members(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms')),
  template text not null,
  send_time time not null default '18:30',
  timezone text not null default 'Asia/Amman',
  active boolean not null default true,
  last_queued_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  audience text not null,
  category text,
  message text not null,
  scheduled_at timestamptz,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  segment_count integer not null default 1 check (segment_count > 0),
  status text not null default 'draft' check (status in ('draft', 'queued', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  campaign_id uuid references public.message_campaigns(id) on delete set null,
  member_id uuid references public.clinic_members(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  channel text not null check (channel in ('sms', 'whatsapp')),
  recipient text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'scheduled', 'sending', 'preview', 'sent', 'delivered', 'failed', 'cancelled')),
  provider_reference text,
  provider_response jsonb,
  error_message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.electronic_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  invoice_number text not null,
  invoice_date date not null,
  currency text not null default 'JOD',
  total_amount numeric(12,3) not null default 0 check (total_amount >= 0),
  operation_ids uuid[] not null default '{}'::uuid[],
  ubl_xml text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'queued', 'submitted', 'accepted', 'failed', 'cancelled')),
  provider_reference text,
  provider_response jsonb,
  error_message text,
  submitted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, invoice_number)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members member
    where member.clinic_id = target_clinic_id
      and member.user_id = auth.uid()
      and member.active = true
  );
$$;

create or replace function public.current_member_role(target_clinic_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select member.role
  from public.clinic_members member
  where member.clinic_id = target_clinic_id
    and member.user_id = auth.uid()
    and member.active = true
  limit 1;
$$;

create or replace function public.current_member_staff_id(target_clinic_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member.staff_id
  from public.clinic_members member
  where member.clinic_id = target_clinic_id
    and member.user_id = auth.uid()
    and member.active = true
  limit 1;
$$;

create or replace function public.current_member_can_view_sensitive(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select member.role = 'admin'::public.app_role or member.can_view_sensitive = true
    from public.clinic_members member
    where member.clinic_id = target_clinic_id
      and member.user_id = auth.uid()
      and member.active = true
    limit 1
  ), false);
$$;

create or replace function public.current_member_own_entries_only(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select member.own_entries_only
    from public.clinic_members member
    where member.clinic_id = target_clinic_id
      and member.user_id = auth.uid()
      and member.active = true
    limit 1
  ), true);
$$;

create or replace function public.can_manage_clinic(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role(target_clinic_id) = 'admin'::public.app_role;
$$;

create or replace function public.can_manage_operations(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role(target_clinic_id) in ('admin'::public.app_role, 'data_entry'::public.app_role);
$$;

create or replace function public.can_access_staff_linked_record(
  target_clinic_id uuid,
  doctor_id uuid,
  specialist_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_clinic_member(target_clinic_id)
    and (
      public.current_member_own_entries_only(target_clinic_id) = false
      or public.current_member_staff_id(target_clinic_id) = doctor_id
      or public.current_member_staff_id(target_clinic_id) = specialist_id
    );
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_clinic_id uuid;
  target_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    target_clinic_id := old.clinic_id;
    target_entity_id := old.id;
  else
    target_clinic_id := new.clinic_id;
    target_entity_id := new.id;
  end if;

  insert into public.audit_logs (
    clinic_id,
    actor_user_id,
    action,
    entity_table,
    entity_id,
    before_data,
    after_data
  )
  values (
    target_clinic_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    target_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.create_owner_membership_for_new_clinic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.clinic_members (
      clinic_id,
      user_id,
      email,
      name,
      role,
      allowed_views,
      can_view_sensitive,
      own_entries_only,
      can_manage_permissions,
      active
    )
    values (
      new.id,
      auth.uid(),
      null,
      'Clinic Owner',
      'admin',
      array['dashboard','entries','patients','bookings','staff','services','inventory','reconcile','salaries','reports','communications','accounts','leads']::text[],
      true,
      false,
      true,
      true
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists clinics_touch_updated_at on public.clinics;
create trigger clinics_touch_updated_at
before update on public.clinics
for each row execute function public.touch_updated_at();

drop trigger if exists clinics_create_owner_membership on public.clinics;
create trigger clinics_create_owner_membership
after insert on public.clinics
for each row execute function public.create_owner_membership_for_new_clinic();

drop trigger if exists staff_touch_updated_at on public.staff;
create trigger staff_touch_updated_at
before update on public.staff
for each row execute function public.touch_updated_at();

drop trigger if exists clinic_members_touch_updated_at on public.clinic_members;
create trigger clinic_members_touch_updated_at
before update on public.clinic_members
for each row execute function public.touch_updated_at();

drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at
before update on public.services
for each row execute function public.touch_updated_at();

drop trigger if exists payout_rules_touch_updated_at on public.payout_rules;
create trigger payout_rules_touch_updated_at
before update on public.payout_rules
for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
before update on public.bookings
for each row execute function public.touch_updated_at();

drop trigger if exists operations_touch_updated_at on public.operations;
create trigger operations_touch_updated_at
before update on public.operations
for each row execute function public.touch_updated_at();

drop trigger if exists suppliers_touch_updated_at on public.suppliers;
create trigger suppliers_touch_updated_at
before update on public.suppliers
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_items_touch_updated_at on public.inventory_items;
create trigger inventory_items_touch_updated_at
before update on public.inventory_items
for each row execute function public.touch_updated_at();

drop trigger if exists purchase_orders_touch_updated_at on public.purchase_orders;
create trigger purchase_orders_touch_updated_at
before update on public.purchase_orders
for each row execute function public.touch_updated_at();

drop trigger if exists reconciliations_touch_updated_at on public.reconciliations;
create trigger reconciliations_touch_updated_at
before update on public.reconciliations
for each row execute function public.touch_updated_at();

drop trigger if exists salary_slips_touch_updated_at on public.salary_slips;
create trigger salary_slips_touch_updated_at
before update on public.salary_slips
for each row execute function public.touch_updated_at();

drop trigger if exists patients_touch_updated_at on public.patients;
create trigger patients_touch_updated_at
before update on public.patients
for each row execute function public.touch_updated_at();

drop trigger if exists automation_rules_touch_updated_at on public.automation_rules;
create trigger automation_rules_touch_updated_at
before update on public.automation_rules
for each row execute function public.touch_updated_at();

drop trigger if exists message_campaigns_touch_updated_at on public.message_campaigns;
create trigger message_campaigns_touch_updated_at
before update on public.message_campaigns
for each row execute function public.touch_updated_at();

drop trigger if exists outbound_messages_touch_updated_at on public.outbound_messages;
create trigger outbound_messages_touch_updated_at
before update on public.outbound_messages
for each row execute function public.touch_updated_at();

drop trigger if exists electronic_invoices_touch_updated_at on public.electronic_invoices;
create trigger electronic_invoices_touch_updated_at
before update on public.electronic_invoices
for each row execute function public.touch_updated_at();

drop trigger if exists operations_audit_log on public.operations;
create trigger operations_audit_log
after insert or update or delete on public.operations
for each row execute function public.write_audit_log();

drop trigger if exists bookings_audit_log on public.bookings;
create trigger bookings_audit_log
after insert or update or delete on public.bookings
for each row execute function public.write_audit_log();

drop trigger if exists inventory_items_audit_log on public.inventory_items;
create trigger inventory_items_audit_log
after insert or update or delete on public.inventory_items
for each row execute function public.write_audit_log();

drop trigger if exists purchase_orders_audit_log on public.purchase_orders;
create trigger purchase_orders_audit_log
after insert or update or delete on public.purchase_orders
for each row execute function public.write_audit_log();

drop trigger if exists salary_slips_audit_log on public.salary_slips;
create trigger salary_slips_audit_log
after insert or update or delete on public.salary_slips
for each row execute function public.write_audit_log();

drop trigger if exists patients_audit_log on public.patients;
create trigger patients_audit_log
after insert or update or delete on public.patients
for each row execute function public.write_audit_log();

drop trigger if exists message_campaigns_audit_log on public.message_campaigns;
create trigger message_campaigns_audit_log
after insert or update or delete on public.message_campaigns
for each row execute function public.write_audit_log();

drop trigger if exists electronic_invoices_audit_log on public.electronic_invoices;
create trigger electronic_invoices_audit_log
after insert or update or delete on public.electronic_invoices
for each row execute function public.write_audit_log();

create index if not exists staff_clinic_role_idx on public.staff (clinic_id, role, active);
create index if not exists services_clinic_active_idx on public.services (clinic_id, active);
create index if not exists payout_rules_clinic_idx on public.payout_rules (clinic_id, applies_to, person_id, service_id, active);
create index if not exists bookings_clinic_date_idx on public.bookings (clinic_id, booking_date, booking_time);
create index if not exists bookings_team_idx on public.bookings (clinic_id, doctor_id, specialist_id);
create index if not exists operations_clinic_date_idx on public.operations (clinic_id, operation_date desc);
create index if not exists operations_team_idx on public.operations (clinic_id, doctor_id, specialist_id);
create index if not exists operations_patient_idx on public.operations (clinic_id, patient_name);
create index if not exists operations_visit_idx on public.operations (clinic_id, visit_id);
create index if not exists operation_payouts_staff_idx on public.operation_payouts (clinic_id, staff_id);
create index if not exists suppliers_clinic_idx on public.suppliers (clinic_id, active);
create index if not exists inventory_items_clinic_idx on public.inventory_items (clinic_id, active);
create index if not exists inventory_items_low_stock_idx on public.inventory_items (clinic_id, active, quantity, low_threshold);
create index if not exists purchase_orders_clinic_date_idx on public.purchase_orders (clinic_id, order_date desc);
create index if not exists reconciliations_clinic_date_idx on public.reconciliations (clinic_id, work_date desc);
create index if not exists salary_slips_period_idx on public.salary_slips (clinic_id, staff_id, period_start, period_end);
create index if not exists audit_logs_clinic_created_idx on public.audit_logs (clinic_id, created_at desc);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists patients_clinic_name_idx on public.patients (clinic_id, full_name);
create index if not exists patients_clinic_phone_idx on public.patients (clinic_id, phone);
create index if not exists patients_consent_idx on public.patients (clinic_id, marketing_consent, active);
create index if not exists automation_rules_schedule_idx on public.automation_rules (clinic_id, active, send_time);
create index if not exists campaigns_status_schedule_idx on public.message_campaigns (clinic_id, status, scheduled_at);
create index if not exists outbound_messages_status_idx on public.outbound_messages (clinic_id, status, scheduled_at);
create index if not exists electronic_invoices_status_idx on public.electronic_invoices (clinic_id, status, invoice_date desc);

alter table public.clinics enable row level security;
alter table public.staff enable row level security;
alter table public.clinic_members enable row level security;
alter table public.services enable row level security;
alter table public.payout_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.operations enable row level security;
alter table public.operation_payouts enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.reconciliations enable row level security;
alter table public.salary_slips enable row level security;
alter table public.salary_slip_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.leads enable row level security;
alter table public.patients enable row level security;
alter table public.automation_rules enable row level security;
alter table public.message_campaigns enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.electronic_invoices enable row level security;

drop policy if exists clinics_select_member on public.clinics;
create policy clinics_select_member on public.clinics
for select using (public.is_clinic_member(id));

drop policy if exists clinics_insert_authenticated on public.clinics;
create policy clinics_insert_authenticated on public.clinics
for insert with check (auth.uid() is not null);

drop policy if exists clinics_update_admin on public.clinics;
create policy clinics_update_admin on public.clinics
for update using (public.can_manage_clinic(id))
with check (public.can_manage_clinic(id));

drop policy if exists staff_select_member on public.staff;
create policy staff_select_member on public.staff
for select using (public.is_clinic_member(clinic_id));

drop policy if exists staff_manage_admin on public.staff;
create policy staff_manage_admin on public.staff
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists clinic_members_select_self_or_admin on public.clinic_members;
create policy clinic_members_select_self_or_admin on public.clinic_members
for select using (user_id = auth.uid() or public.can_manage_clinic(clinic_id));

drop policy if exists clinic_members_manage_admin on public.clinic_members;
create policy clinic_members_manage_admin on public.clinic_members
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists services_select_member on public.services;
create policy services_select_member on public.services
for select using (public.is_clinic_member(clinic_id));

drop policy if exists services_manage_admin on public.services;
create policy services_manage_admin on public.services
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists payout_rules_select_sensitive on public.payout_rules;
create policy payout_rules_select_sensitive on public.payout_rules
for select using (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists payout_rules_manage_admin on public.payout_rules;
create policy payout_rules_manage_admin on public.payout_rules
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists bookings_select_member_or_own on public.bookings;
create policy bookings_select_member_or_own on public.bookings
for select using (public.can_access_staff_linked_record(clinic_id, doctor_id, specialist_id));

drop policy if exists bookings_manage_operations on public.bookings;
create policy bookings_manage_operations on public.bookings
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists operations_select_member_or_own on public.operations;
create policy operations_select_member_or_own on public.operations
for select using (public.can_access_staff_linked_record(clinic_id, doctor_id, specialist_id));

drop policy if exists operations_manage_operations on public.operations;
create policy operations_manage_operations on public.operations
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists operation_payouts_select_sensitive_or_own on public.operation_payouts;
create policy operation_payouts_select_sensitive_or_own on public.operation_payouts
for select using (
  public.current_member_can_view_sensitive(clinic_id)
  or public.current_member_staff_id(clinic_id) = staff_id
);

drop policy if exists operation_payouts_manage_operations on public.operation_payouts;
create policy operation_payouts_manage_operations on public.operation_payouts
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists suppliers_select_member on public.suppliers;
create policy suppliers_select_member on public.suppliers
for select using (public.is_clinic_member(clinic_id));

drop policy if exists suppliers_manage_operations on public.suppliers;
create policy suppliers_manage_operations on public.suppliers
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists inventory_select_member on public.inventory_items;
create policy inventory_select_member on public.inventory_items
for select using (public.is_clinic_member(clinic_id));

drop policy if exists inventory_manage_operations on public.inventory_items;
create policy inventory_manage_operations on public.inventory_items
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists purchase_orders_select_member on public.purchase_orders;
create policy purchase_orders_select_member on public.purchase_orders
for select using (public.is_clinic_member(clinic_id));

drop policy if exists purchase_orders_manage_operations on public.purchase_orders;
create policy purchase_orders_manage_operations on public.purchase_orders
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists reconciliations_select_sensitive on public.reconciliations;
create policy reconciliations_select_sensitive on public.reconciliations
for select using (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists reconciliations_manage_sensitive on public.reconciliations;
create policy reconciliations_manage_sensitive on public.reconciliations
for all using (public.current_member_can_view_sensitive(clinic_id))
with check (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists salary_slips_select_sensitive_or_own on public.salary_slips;
create policy salary_slips_select_sensitive_or_own on public.salary_slips
for select using (
  public.current_member_can_view_sensitive(clinic_id)
  or public.current_member_staff_id(clinic_id) = staff_id
);

drop policy if exists salary_slips_manage_sensitive on public.salary_slips;
create policy salary_slips_manage_sensitive on public.salary_slips
for all using (public.current_member_can_view_sensitive(clinic_id))
with check (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists salary_slip_items_select_sensitive_or_own on public.salary_slip_items;
create policy salary_slip_items_select_sensitive_or_own on public.salary_slip_items
for select using (
  public.current_member_can_view_sensitive(clinic_id)
  or exists (
    select 1
    from public.salary_slips slip
    where slip.id = salary_slip_items.salary_slip_id
      and slip.staff_id = public.current_member_staff_id(salary_slip_items.clinic_id)
  )
);

drop policy if exists salary_slip_items_manage_sensitive on public.salary_slip_items;
create policy salary_slip_items_manage_sensitive on public.salary_slip_items
for all using (public.current_member_can_view_sensitive(clinic_id))
with check (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
for select using (public.can_manage_clinic(clinic_id));

drop policy if exists audit_logs_insert_system on public.audit_logs;
create policy audit_logs_insert_system on public.audit_logs
for insert with check (public.can_manage_clinic(clinic_id));

drop policy if exists patients_select_member on public.patients;
create policy patients_select_member on public.patients
for select using (public.is_clinic_member(clinic_id));

drop policy if exists patients_manage_operations on public.patients;
create policy patients_manage_operations on public.patients
for all using (public.can_manage_operations(clinic_id))
with check (public.can_manage_operations(clinic_id));

drop policy if exists automation_rules_select_admin on public.automation_rules;
create policy automation_rules_select_admin on public.automation_rules
for select using (public.can_manage_clinic(clinic_id));

drop policy if exists automation_rules_manage_admin on public.automation_rules;
create policy automation_rules_manage_admin on public.automation_rules
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists campaigns_select_operations on public.message_campaigns;
create policy campaigns_select_operations on public.message_campaigns
for select using (public.can_manage_operations(clinic_id));

drop policy if exists campaigns_manage_admin on public.message_campaigns;
create policy campaigns_manage_admin on public.message_campaigns
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists outbound_messages_select_operations on public.outbound_messages;
create policy outbound_messages_select_operations on public.outbound_messages
for select using (public.can_manage_operations(clinic_id));

drop policy if exists outbound_messages_manage_admin on public.outbound_messages;
create policy outbound_messages_manage_admin on public.outbound_messages
for all using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

drop policy if exists electronic_invoices_select_sensitive on public.electronic_invoices;
create policy electronic_invoices_select_sensitive on public.electronic_invoices
for select using (public.current_member_can_view_sensitive(clinic_id));

drop policy if exists electronic_invoices_manage_sensitive on public.electronic_invoices;
create policy electronic_invoices_manage_sensitive on public.electronic_invoices
for all using (public.current_member_can_view_sensitive(clinic_id))
with check (public.current_member_can_view_sensitive(clinic_id));
