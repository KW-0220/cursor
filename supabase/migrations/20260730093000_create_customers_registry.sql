-- Applied via Supabase MCP (create_customers_registry)
-- Kept in-repo for reference / local supabase db push

create table if not exists public.customers (
  id text primary key,
  applicant_name_zh text not null,
  applicant_name_en text not null,
  id_number text not null,
  phone text not null,
  email text not null,
  title text not null,
  relation text not null check (relation in ('董事', '股東', '獲授權代表', '其他')),
  company_name_zh text not null,
  company_name_en text not null,
  br_number text not null,
  cr_number text not null,
  founded_at text not null,
  company_type text not null,
  industry text not null,
  address text not null,
  employees integer not null default 0 check (employees >= 0),
  website text,
  contact_person text not null,
  source text default 'register',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (lower(email));
create index if not exists customers_br_number_idx on public.customers (br_number);
create index if not exists customers_updated_at_idx on public.customers (updated_at desc);

alter table public.customers enable row level security;
