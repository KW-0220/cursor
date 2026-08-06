-- 開戶文件通後台角色 biz_admin（與 SME admin 分離）

drop policy if exists biz_applications_select_own on public.biz_applications;
create policy biz_applications_select_own
  on public.biz_applications
  for select
  to authenticated
  using (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'biz_admin')
  );

drop policy if exists biz_applications_insert_own on public.biz_applications;
create policy biz_applications_insert_own
  on public.biz_applications
  for insert
  to authenticated
  with check (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'biz_admin')
  );

drop policy if exists biz_applications_update_own on public.biz_applications;
create policy biz_applications_update_own
  on public.biz_applications
  for update
  to authenticated
  using (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'biz_admin')
  )
  with check (
    lower(coalesce(applicant_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'biz_admin')
  );

drop policy if exists biz_applications_delete_admin on public.biz_applications;
create policy biz_applications_delete_admin
  on public.biz_applications
  for delete
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'biz_admin')
  );
