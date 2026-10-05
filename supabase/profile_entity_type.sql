-- Public author identity used by Profile/Recipe/Recipeed structured data.
-- Existing accounts stay people; Brand onboarding explicitly marks its own account as an organization.

alter table public.profiles
  add column if not exists entity_type text not null default 'person';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_entity_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_entity_type_check
      check (entity_type in ('person', 'organization'));
  end if;
end
$$;

-- profiles는 개인정보 보호를 위해 공개 SELECT가 컬럼 단위다.
-- 새 공개 작성자 타입도 email/role을 노출하지 않고 이 컬럼만 읽게 한다.
grant select (entity_type) on public.profiles to anon, authenticated;
