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

alter table public.leads enable row level security;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_phone_idx on public.leads (phone);
