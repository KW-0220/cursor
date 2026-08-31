-- SME LoanFlow core persistence (Postgres)
-- Applied via Supabase MCP; kept in repo for reference.

create table if not exists public.slf_users (
  id text primary key,
  email text not null,
  password_hash text not null,
  name_zh text,
  phone text,
  id_number text,
  profile_completed boolean not null default false,
  role text check (role is null or role in ('applicant','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists slf_users_email_lower_idx
  on public.slf_users (lower(email));

create table if not exists public.slf_applications (
  id text primary key,
  loan_type text,
  amount numeric not null default 0,
  purpose text not null default '',
  status text not null default 'under_review',
  failure_reason text,
  docs_pct numeric,
  bank_count integer,
  customer_id text,
  applicant_name_zh text,
  company_name_zh text,
  email text,
  phone text,
  documents jsonb not null default '[]'::jsonb,
  ai_analysis jsonb,
  mortgage_kind text,
  is_shell_company boolean,
  mortgage_calc jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slf_documents (
  id text primary key,
  customer_id text,
  application_id text not null,
  kind text not null,
  slot text not null,
  file_name text not null,
  mime_type text not null,
  size bigint not null default 0,
  storage_path text not null,
  storage text not null default 'supabase',
  created_at timestamptz not null default now()
);

create table if not exists public.slf_supplements (
  id text primary key,
  application_id text not null,
  document_type text not null,
  reason_template text not null default '',
  reason text not null default '',
  detail text not null default '',
  due_date text not null default '',
  required boolean not null default true,
  need_ocr boolean not null default false,
  notify_channels jsonb not null default '[]'::jsonb,
  to_email text,
  customer_id text,
  company_name_zh text,
  applicant_name_zh text,
  email_subject text,
  status text not null default 'open',
  email_status text not null default 'skipped',
  email_id text,
  email_error text,
  push_status text not null default 'skipped',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slf_analysis_archive (
  id text primary key,
  title text not null,
  file_name text,
  doc_kind text not null default 'other',
  company_name text,
  customer_id text,
  loan_type text,
  amount_hkd numeric,
  purpose text,
  summary text,
  overall text,
  payload jsonb not null default '{}'::jsonb,
  notes text,
  archived_by text,
  archived_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
