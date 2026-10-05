-- 레시피 관계 그래프와 행동 기록 (성장 고리 1단계).
-- 쓰기 경로는 기존 그대로 items.cited_recipe_ids 이며, 트리거가 관계 표를 맞춘다.
-- 관계 종류는 사용자에게 묻지 않고 작성 경로(creation_origin)에서 정한다.
-- 여러 번 실행해도 안전하다.

alter table public.items add column if not exists creation_origin text
  check (creation_origin in ('recipe_detail', 'cook_mode', 'fork', 'manual', 'partner_onboarding'));

create table if not exists public.content_relations (
  from_item_id uuid not null references public.items(id) on delete cascade,
  to_recipe_id uuid not null references public.items(id) on delete cascade,
  relation_type text not null check (relation_type in ('cooked', 'adapted', 'referenced')),
  origin text,
  created_at timestamptz not null default now(),
  primary key (from_item_id, to_recipe_id)
);
create index if not exists content_relations_to_idx on public.content_relations (to_recipe_id, relation_type, created_at desc);

alter table public.content_relations enable row level security;

-- 양쪽 글이 모두 공개이거나, 내가 쓴 글의 관계만 읽는다. 쓰기는 트리거만 한다.
drop policy if exists "Read relations of visible items" on public.content_relations;
create policy "Read relations of visible items" on public.content_relations
  for select using (
    exists (select 1 from public.items f where f.id = from_item_id and (f.is_public or f.user_id = auth.uid()))
    and exists (select 1 from public.items t where t.id = to_recipe_id and (t.is_public or t.user_id = auth.uid()))
  );

create or replace function public.sync_content_relations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rel text;
begin
  rel := case
    when new.item_type = 'post' and new.creation_origin in ('recipe_detail', 'cook_mode') then 'cooked'
    when new.item_type = 'recipe' and new.creation_origin = 'fork' then 'adapted'
    else 'referenced'
  end;

  delete from content_relations
  where from_item_id = new.id
    and to_recipe_id <> all (coalesce(new.cited_recipe_ids, '{}'::uuid[]));

  insert into content_relations (from_item_id, to_recipe_id, relation_type, origin)
  select new.id, r.id, rel, new.creation_origin
  from items r
  where r.id = any (coalesce(new.cited_recipe_ids, '{}'::uuid[]))
    and r.item_type = 'recipe'
    and r.id <> new.id
  on conflict (from_item_id, to_recipe_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.sync_content_relations() from public, anon, authenticated;

drop trigger if exists items_sync_content_relations on public.items;
create trigger items_sync_content_relations
  after insert or update of cited_recipe_ids, creation_origin on public.items
  for each row execute function public.sync_content_relations();

-- 기존 인용 옮기기 (작성 경로를 모르므로 referenced)
insert into public.content_relations (from_item_id, to_recipe_id, relation_type, origin, created_at)
select i.id, r.id, 'referenced', null, i.created_at
from public.items i
join public.items r on r.id = any (i.cited_recipe_ids) and r.item_type = 'recipe' and r.id <> i.id
on conflict do nothing;

-- 행동 기록: 로그인 사용자가 자기 행동만 쓴다. 읽기는 관리자(서비스 키)만.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  type text not null check (type in (
    'detail_open', 'cook_start', 'cook_complete', 'save', 'recipeed_create', 'derived_create', 'profile_open', 'follow', 'unfollow', 'share', 'recipeed_start', 'related_open'
  )),
  origin text,
  created_at timestamptz not null default now()
);
create index if not exists events_item_type_idx on public.events (item_id, type, created_at desc);
create index if not exists events_type_created_idx on public.events (type, created_at desc);

alter table public.events enable row level security;
drop policy if exists "Insert own events" on public.events;
create policy "Insert own events" on public.events
  for insert to authenticated with check (user_id = auth.uid());

-- 프로필 지표: 이 사람의 공개 레시피에서 나온 공개 글 수 (만들어짐 / 이어짐 / 참고됨)
create or replace function public.get_profile_lineage_counts(profile_user_id uuid)
returns table (recipes_count bigint, cooked_count bigint, adapted_count bigint, referenced_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from items where user_id = profile_user_id and item_type = 'recipe' and is_public),
    count(*) filter (where cr.relation_type = 'cooked'),
    count(*) filter (where cr.relation_type = 'adapted'),
    count(*) filter (where cr.relation_type = 'referenced')
  from content_relations cr
  join items t on t.id = cr.to_recipe_id and t.user_id = profile_user_id and t.is_public
  join items f on f.id = cr.from_item_id and f.is_public and f.user_id <> profile_user_id;
$$;

grant execute on function public.get_profile_lineage_counts(uuid) to anon, authenticated;
