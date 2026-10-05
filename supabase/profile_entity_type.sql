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
