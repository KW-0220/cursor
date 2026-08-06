-- 申請人／公司關鍵欄位改為正式表格欄位（仍保留 payload jsonb 作完整快照）

alter table public.biz_applications
  add column if not exists applicant_relation text,
  add column if not exists applicant_best_contact_time text,
  add column if not exists applicant_preferred_language text,
  add column if not exists applicant_authorized boolean,
  add column if not exists company_type text,
  add column if not exists company_founded_at text,
  add column if not exists company_phone text,
  add column if not exists company_email text,
  add column if not exists company_nature text,
  add column if not exists company_products text,
  add column if not exists company_registered_address text,
  add column if not exists company_business_address text,
  add column if not exists company_monthly_turnover text,
  add column if not exists company_yearly_turnover text,
  add column if not exists company_employees text;

-- 從既有 payload 回填
update public.biz_applications
set
  applicant_relation = coalesce(
    applicant_relation,
    nullif(payload #>> '{applicant,relation}', '')
  ),
  applicant_best_contact_time = coalesce(
    applicant_best_contact_time,
    nullif(payload #>> '{applicant,bestContactTime}', '')
  ),
  applicant_preferred_language = coalesce(
    applicant_preferred_language,
    nullif(payload #>> '{applicant,preferredLanguage}', '')
  ),
  applicant_authorized = coalesce(
    applicant_authorized,
    case
      when payload #>> '{applicant,authorized}' = 'true' then true
      when payload #>> '{applicant,authorized}' = 'false' then false
      else null
    end
  ),
  company_type = coalesce(
    company_type,
    nullif(payload #>> '{company,companyType}', '')
  ),
  company_founded_at = coalesce(
    company_founded_at,
    nullif(payload #>> '{company,foundedAt}', '')
  ),
  company_phone = coalesce(
    company_phone,
    nullif(payload #>> '{company,phone}', '')
  ),
  company_email = coalesce(
    company_email,
    nullif(payload #>> '{company,email}', '')
  ),
  company_nature = coalesce(
    company_nature,
    nullif(payload #>> '{company,nature}', '')
  ),
  company_products = coalesce(
    company_products,
    nullif(payload #>> '{company,products}', '')
  ),
  company_registered_address = coalesce(
    company_registered_address,
    nullif(payload #>> '{company,registeredAddress}', '')
  ),
  company_business_address = coalesce(
    company_business_address,
    nullif(payload #>> '{company,businessAddress}', '')
  ),
  company_monthly_turnover = coalesce(
    company_monthly_turnover,
    nullif(payload #>> '{company,monthlyTurnover}', '')
  ),
  company_yearly_turnover = coalesce(
    company_yearly_turnover,
    nullif(payload #>> '{company,yearlyTurnover}', '')
  ),
  company_employees = coalesce(
    company_employees,
    nullif(payload #>> '{company,employees}', '')
  );

create index if not exists biz_applications_applicant_name_idx
  on public.biz_applications (applicant_name);

-- 清除內建示範申請
delete from public.biz_applications
where id in ('BA-2026-10482', 'BA-2026-11003')
   or (
     applicant_name in ('陳雅婷', '王俊傑')
     and company_name_zh in ('智航貿易有限公司', '創啟顧問有限公司')
   );
