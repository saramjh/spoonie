-- 성장 고리 점검 (읽기 전용).
-- Supabase events는 로그인 사용자의 저빈도 행동만 저장한다.
-- 홈 feed_impression은 무료 티어 DB 쓰기를 보호하기 위해 GA4에서만 집계한다.

-- 1) 최근 30일 핵심 funnel: 레시피 열람 → 요리 시작/완료 → Recipeed 작성 의도 → 실제 생성
select
  count(distinct e.user_id) filter (where e.type = 'detail_open' and i.item_type = 'recipe') as recipe_viewers,
  count(distinct e.user_id) filter (where e.type = 'cook_start') as cook_starters,
  count(distinct e.user_id) filter (where e.type = 'cook_complete') as cook_completers,
  count(distinct e.user_id) filter (where e.type = 'recipeed_start') as recipeed_starters,
  count(distinct e.user_id) filter (where e.type = 'recipeed_create') as recipeed_creators
from events e
left join items i on i.id = e.item_id
where e.created_at > now() - interval '30 days';

-- 2) Recipe → Recipeed 경로별 실제 생성.
-- create origin은 recipe_detail:<source recipe uuid> / cook_mode:<source recipe uuid> / manual.
select
  case
    when origin like 'recipe_detail:%' then 'recipe_detail'
    when origin like 'cook_mode:%' then 'cook_mode'
    else coalesce(origin, 'unknown')
  end as origin_group,
  count(*) as creates,
  count(distinct user_id) as creators
from events
where created_at > now() - interval '30 days'
  and type = 'recipeed_create'
group by 1
order by creates desc;

-- 3) 작성자 발견: 글에서 프로필로 간 방문 중 그 작성자의 다른 Recipe를 이어서 연 비율
with visits as (
  select e.user_id, split_part(e.origin, '|', 2)::uuid as author_id, e.item_id as from_item, e.created_at
  from events e
  where e.type = 'profile_open'
    and e.item_id is not null
    and e.origin like '%|%'
    and e.created_at > now() - interval '30 days'
)
select
  count(*) as profile_visits_from_content,
  count(*) filter (where exists (
    select 1
    from events d
    join items r on r.id = d.item_id
    where d.user_id = v.user_id
      and d.type = 'detail_open'
      and r.item_type = 'recipe'
      and r.user_id = v.author_id
      and r.id <> v.from_item
      and d.created_at between v.created_at and v.created_at + interval '30 minutes'
  )) as then_opened_another_recipe
from visits v;

-- 4) 상세 열람이 어느 surface에서 오는가
select origin, count(*) as opens, count(distinct user_id) as people
from events
where type = 'detail_open'
  and created_at > now() - interval '30 days'
group by origin
order by opens desc;

-- 5) 저빈도 social/discovery 행동이 어느 surface에서 발생하는가
select type, origin, count(*) as events, count(distinct user_id) as people
from events
where type in ('follow', 'unfollow', 'share', 'related_open', 'recipeed_start')
  and created_at > now() - interval '30 days'
group by type, origin
order by type, events desc;
