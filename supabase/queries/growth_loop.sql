-- 성장 고리 점검 (읽기 전용). 로그인 사용자의 행동만 기록되므로 비회원 열람은 빠져 있다.
-- events.origin: detail_open = 온 화면, profile_open = "온 화면|본 사람 id" (글에서 왔으면 item_id가 그 글)

-- 1) 최근 30일 단계별 사람 수: 레시피 열람 → 요리 시작 → 요리 완료 → 기록
select
  count(distinct e.user_id) filter (where e.type = 'detail_open' and i.item_type = 'recipe') as recipe_viewers,
  count(distinct e.user_id) filter (where e.type = 'cook_start') as cook_starters,
  count(distinct e.user_id) filter (where e.type = 'cook_complete') as cook_completers,
  count(distinct e.user_id) filter (where e.type = 'recipeed_create') as recorders
from events e left join items i on i.id = e.item_id
where e.created_at > now() - interval '30 days';

-- 2) 작성자 발견: 글에서 프로필로 간 방문 중, 그 프로필 주인의 다른 레시피를 이어서 연 비율
with visits as (
  select e.user_id, split_part(e.origin, '|', 2)::uuid as author_id, e.item_id as from_item, e.created_at
  from events e
  where e.type = 'profile_open' and e.item_id is not null and e.created_at > now() - interval '30 days'
)
select
  count(*) as profile_visits_from_content,
  count(*) filter (where exists (
    select 1 from events d join items r on r.id = d.item_id
    where d.user_id = v.user_id and d.type = 'detail_open' and r.item_type = 'recipe'
      and r.user_id = v.author_id and r.id <> v.from_item
      and d.created_at between v.created_at and v.created_at + interval '30 minutes'
  )) as then_opened_another_recipe
from visits v;

-- 3) 상세 열람이 어느 화면에서 오는가
select origin, count(*) as opens, count(distinct user_id) as people
from events where type = 'detail_open' and created_at > now() - interval '30 days'
group by origin order by opens desc;
