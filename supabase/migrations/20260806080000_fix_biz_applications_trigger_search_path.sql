-- Fix search_path on biz_applications updated_at trigger
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
