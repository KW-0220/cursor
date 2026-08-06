-- Applied remotely via Supabase MCP (create_biz_applications)
-- 開戶文件通：申請主表（JSON payload 存完整 BizApplication）

create table if not exists public.biz_applications (
  id text primary key,
  status text not null default 'draft',
  completeness integer not null default 0 check (completeness >= 0 and completeness <= 100),
  assignee text,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  applicant_whatsapp text,
  company_name_zh text,
  company_name_en text,
  br_number text,
  cr_number text,
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists biz_applications_status_idx on public.biz_applications (status);
create index if not exists biz_applications_updated_at_idx on public.biz_applications (updated_at desc);
create index if not exists biz_applications_company_zh_idx on public.biz_applications (company_name_zh);
create index if not exists biz_applications_applicant_email_idx on public.biz_applications (lower(coalesce(applicant_email, '')));
create index if not exists biz_applications_whatsapp_idx on public.biz_applications (applicant_whatsapp);

alter table public.biz_applications enable row level security;

drop policy if exists biz_applications_select_own on public.biz_applications;
create policy biz_applications_select_own
  on public.biz_applications
  for select
  to authenticated
  using (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

drop policy if exists biz_applications_insert_own on public.biz_applications;
create policy biz_applications_insert_own
  on public.biz_applications
  for insert
  to authenticated
  with check (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

drop policy if exists biz_applications_update_own on public.biz_applications;
create policy biz_applications_update_own
  on public.biz_applications
  for update
  to authenticated
  using (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  )
  with check (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

drop policy if exists biz_applications_delete_admin on public.biz_applications;
create policy biz_applications_delete_admin
  on public.biz_applications
  for delete
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

grant select, insert, update, delete on public.biz_applications to authenticated;
grant select, insert, update, delete on public.biz_applications to service_role;

create or replace function public.set_biz_applications_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists biz_applications_set_updated_at on public.biz_applications;
create trigger biz_applications_set_updated_at
before update on public.biz_applications
for each row execute function public.set_biz_applications_updated_at();
