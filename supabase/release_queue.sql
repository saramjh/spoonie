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
