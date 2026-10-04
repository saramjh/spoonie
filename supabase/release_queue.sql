-- 나눠서 공개하기: 미리 비공개로 올려 둔 레시피를 정해진 순서대로 하나씩 공개한다.
-- netlify/functions/release-queued-recipes.js가 하루 두 번 맨 앞 하나를 공개하고 released_at을 적는다.
-- 서버(secret key)만 쓰는 표라 RLS를 켜고 정책은 두지 않는다 (브라우저에서는 읽지도 쓰지도 못한다).

create table if not exists public.release_queue (
  item_id uuid primary key references public.items(id) on delete cascade,
  release_order integer not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists release_queue_pending_idx on public.release_queue (release_order) where released_at is null;

alter table public.release_queue enable row level security;

-- 인스타그램 자동 게시 (release-queued-recipes.js): 공개한 레시피를 @spoonie.kitchen에 올린 결과
alter table public.release_queue add column if not exists instagram_media_id text, add column if not exists instagram_error text;

-- 인스타그램 장기 토큰 (60일 만료, 함수가 30일마다 갱신해 여기에 저장). 서버 전용: RLS 켜고 정책 없음
-- 처음에는 Netlify 환경 변수 INSTAGRAM_ACCESS_TOKEN으로 시작하고, 첫 갱신부터 이 표를 쓴다
create table if not exists public.instagram_credentials (
  id smallint primary key default 1 check (id = 1),
  access_token text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.instagram_credentials enable row level security;

-- 인스타그램 게시를 두 번에 나눠 할 수 있게: 만든 묶음(컨테이너) id를 남겨 두고, 시간 안에 못 올리면 다음 실행 때 올린다
alter table public.release_queue add column if not exists instagram_container_id text;

-- 인스타그램 실패는 영구 탈락시키지 않는다. 재시도 시각/횟수와 수동 확인이 필요한 terminal 상태를 별도로 보관한다.
alter table public.release_queue
  add column if not exists instagram_attempt_count integer not null default 0,
  add column if not exists instagram_last_attempt_at timestamptz,
  add column if not exists instagram_next_retry_at timestamptz,
  add column if not exists instagram_terminal_error boolean not null default false;

create index if not exists release_queue_instagram_retry_idx
  on public.release_queue (instagram_next_retry_at, release_order)
  where released_at is not null
    and instagram_media_id is null
    and instagram_terminal_error = false;


-- Growth OS: Instagram 게시 성과를 24h/72h에 한 번씩 관측한다.
alter table public.release_queue
  add column if not exists instagram_published_at timestamptz,
  add column if not exists instagram_insights_24h_status text not null default 'pending'
    check (instagram_insights_24h_status in ('pending', 'captured', 'missed')),
  add column if not exists instagram_insights_72h_status text not null default 'pending'
    check (instagram_insights_72h_status in ('pending', 'captured', 'missed'));

create table if not exists public.instagram_media_insights (
  item_id uuid not null references public.items(id) on delete cascade,
  instagram_media_id text not null,
  checkpoint_hours smallint not null check (checkpoint_hours in (24, 72)),
  published_at timestamptz not null,
  observed_at timestamptz not null default now(),
  observed_age_minutes integer not null check (observed_age_minutes >= 0),
  media_type text,
  permalink text,
  account_followers integer,
  reach integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saved integer not null default 0,
  shares integer not null default 0,
  total_interactions integer not null default 0,
  profile_activity integer,
  profile_visits integer,
  follows integer,
  primary key (instagram_media_id, checkpoint_hours)
);

create index if not exists instagram_media_insights_item_idx
  on public.instagram_media_insights (item_id, checkpoint_hours);

alter table public.instagram_media_insights enable row level security;


-- Growth OS Phase 2: 각 Instagram 게시의 실험 조건을 게시 레코드에 고정한다.
alter table public.release_queue
  add column if not exists instagram_experiment_version text,
  add column if not exists instagram_cta_variant text
    check (instagram_cta_variant is null or instagram_cta_variant in ('site', 'save')),
  add column if not exists instagram_hook_variant text,
  add column if not exists instagram_slide_strategy text,
  add column if not exists instagram_content_format text
    check (instagram_content_format is null or instagram_content_format in ('single', 'carousel')),
  add column if not exists instagram_slide_count smallint
    check (instagram_slide_count is null or instagram_slide_count between 1 and 10);

update public.release_queue
set instagram_experiment_version = 'baseline_v0',
    instagram_cta_variant = 'site',
    instagram_hook_variant = 'recipe_title_v0',
    instagram_slide_strategy = 'hero_gallery_steps_v0'
where instagram_media_id is not null
  and instagram_experiment_version is null;


alter table public.instagram_media_insights
  add column if not exists profile_activity integer,
  add column if not exists profile_visits integer,
  add column if not exists follows integer;
