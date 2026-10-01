-- 공개 스키마 함수의 search_path 고정 (보안 권고 function_search_path_mutable).
-- 2026-10-01 MCP로 적용. 새 함수에는 처음부터 `set search_path = public` 을 붙인다.
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function public.%I(%s) set search_path = public, extensions', r.proname, r.args);
  end loop;
end $$;
