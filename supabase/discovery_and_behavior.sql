-- 발견과 행동 유도 (docs/discovery-and-behavior.md 의 규칙을 그대로 옮긴 것). 여러 번 실행해도 안전하다.
--
-- 1) 행동 기록: 본인 기록 읽기 (profile_open은 origin = "온 화면|본 사람 id", item_id = 온 글)
-- 2) get_explore(): 탐색 화면 한 번의 호출
--    - 점수는 "서로 다른 사람 수"만 센다 (작성자 본인 제외, 반복 행동 무효). 팔로워 수는 쓰지 않는다.
--    - 최근 30일 활동만 센다: 오래 쌓인 인기가 계속 상위를 차지하지 않게 (누적 우위 완화).
--    - 출처가 확인된 만듦(레시피 화면·요리 모드에서 시작)이 사용자가 고른 출처보다 무겁다 (귀속과 분배의 분리).
--    - 한 작성자는 목록에 최대 2개. 반응이 아직 적은 최근 레시피 1개에 자리를 남긴다 (탐색 기회).
-- 3) get_recipe_activity(): 레시피 상세에서 로그인 사용자에게만
--    - 작성자: 내 레시피가 실제로 어떻게 쓰였는지 (다른 사람 기준 수)
--    - 다른 사람: 내가 이 레시피로 요리를 시작했는데 아직 기록이 없는지

drop policy if exists "Read own events" on public.events;
create policy "Read own events" on public.events
  for select to authenticated using (user_id = auth.uid());

create index if not exists events_user_item_idx on public.events (user_id, item_id, type, created_at desc);

create or replace function public.get_explore(recipe_limit int default 8, made_limit int default 9)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recipes as (
    select v.* from optimized_feed_view v where v.item_type = 'recipe'
  ),
  signals as (
    select
      r.id,
      r.user_id,
      r.created_at,
      (select count(distinct f.user_id) from content_relations cr join items f on f.id = cr.from_item_id
        where cr.to_recipe_id = r.id and f.is_public and f.user_id <> r.user_id and f.item_type = 'post'
          and cr.relation_type = 'cooked' and cr.created_at > now() - interval '30 days') as made_verified,
      (select count(distinct f.user_id) from content_relations cr join items f on f.id = cr.from_item_id
        where cr.to_recipe_id = r.id and f.is_public and f.user_id <> r.user_id and f.item_type = 'post'
          and cr.relation_type <> 'cooked' and cr.created_at > now() - interval '30 days') as made_declared,
      (select count(distinct f.user_id) from content_relations cr join items f on f.id = cr.from_item_id
        where cr.to_recipe_id = r.id and f.is_public and f.user_id <> r.user_id and f.item_type = 'recipe'
          and cr.created_at > now() - interval '30 days') as derived,
      (select count(distinct e.user_id) from events e
        where e.item_id = r.id and e.type = 'cook_complete' and e.user_id <> r.user_id and e.created_at > now() - interval '30 days') as cooked,
      (select count(distinct b.user_id) from bookmarks b
        where b.item_id = r.id and b.user_id <> r.user_id and b.created_at > now() - interval '30 days') as saves,
      (select count(distinct l.user_id) from likes l
        where l.item_id = r.id and l.user_id <> r.user_id and l.created_at > now() - interval '30 days') as likes
    from recipes r
  ),
  scored as (
    select s.*,
      (4 * made_verified + 2 * derived + 2 * cooked + 1.5 * made_declared + saves + 0.5 * likes)::numeric as score
    from signals s
  ),
  capped as (
    select sc.*, row_number() over (partition by sc.user_id order by sc.score desc, sc.created_at desc) as creator_rank
    from scored sc
  ),
  ranked as (
    select c.id, c.score, c.created_at,
      row_number() over (order by c.score desc, c.created_at desc) as pos
    from capped c where c.creator_rank <= 2
  ),
  -- 탐색 자리: 21일 안에 올라왔고 아직 반응이 적은 레시피 중 가장 새것, 상위 목록에 없을 때만
  fresh as (
    select c.id from capped c
    where c.creator_rank <= 2 and c.created_at > now() - interval '21 days' and c.score < 2
      and c.id not in (select id from ranked where pos < recipe_limit)
    order by c.created_at desc limit 1
  ),
  picked as (
    select id, pos::numeric as ord, 'trend' as slot from ranked where pos < recipe_limit
    union all
    select id, 2.5, 'fresh' from fresh
  ),
  picked_limited as (
    select * from picked order by ord limit recipe_limit
  ),
  made as (
    select f.*, src.title as source_title,
      row_number() over (partition by src.id order by f.created_at desc) as per_source,
      row_number() over (partition by f.user_id order by f.created_at desc) as per_creator
    from optimized_feed_view f
    join lateral (
      select r.id, r.title from content_relations cr join items r on r.id = cr.to_recipe_id
      where cr.from_item_id = f.id and r.is_public
      order by (cr.relation_type = 'cooked') desc, cr.created_at desc limit 1
    ) src on true
    where f.item_type = 'post'
  )
  select jsonb_build_object(
    'recipes', coalesce((
      select jsonb_agg(to_jsonb(v) || jsonb_build_object('slot', p.slot) order by p.ord)
      from picked_limited p join optimized_feed_view v on v.id = p.id
    ), '[]'::jsonb),
    'made', coalesce((
      select jsonb_agg(m order by m_created desc) from (
        select to_jsonb(made) - 'per_source' - 'per_creator' as m, made.created_at as m_created
        from made where per_source <= 2 and per_creator <= 2
        order by made.created_at desc limit made_limit
      ) x
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_explore(int, int) to anon, authenticated;

create or replace function public.get_recipe_activity(recipe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
begin
  if me is null then return null; end if;
  select user_id into owner from items where id = recipe and item_type = 'recipe';
  if owner is null then return null; end if;

  if owner = me then
    return jsonb_build_object(
      'role', 'owner',
      'viewers', (select count(distinct user_id) from events where item_id = recipe and type = 'detail_open' and user_id <> me),
      'saves', (select count(distinct user_id) from bookmarks where item_id = recipe and user_id <> me),
      'cook_starts', (select count(distinct user_id) from events where item_id = recipe and type = 'cook_start' and user_id <> me),
      'cook_completes', (select count(distinct user_id) from events where item_id = recipe and type = 'cook_complete' and user_id <> me),
      'made', (select count(distinct f.user_id) from content_relations cr join items f on f.id = cr.from_item_id
               where cr.to_recipe_id = recipe and f.item_type = 'post' and f.is_public and f.user_id <> me),
      'profile_visits', (select count(distinct e.user_id) from events e
               where e.type = 'profile_open' and e.item_id = recipe and split_part(e.origin, '|', 2) = me::text and e.user_id <> me)
    );
  end if;

  return jsonb_build_object(
    'role', 'viewer',
    'last_cook_start', (select max(created_at) from events where user_id = me and item_id = recipe and type = 'cook_start'),
    'recorded', exists (select 1 from content_relations cr join items f on f.id = cr.from_item_id
                        where cr.to_recipe_id = recipe and f.user_id = me and f.item_type = 'post')
  );
end;
$$;

revoke execute on function public.get_recipe_activity(uuid) from public, anon;
grant execute on function public.get_recipe_activity(uuid) to authenticated;
